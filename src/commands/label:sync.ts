import * as Github from '@octokit/rest'
import { ux, sdk } from '@cto.ai/sdk'
import { Question, AutoCompleteQuestion } from '@cto.ai/inquirer'
import Debug from 'debug'
import { getGithub } from '../helpers/getGithub'
import { getAllLabelsForRepo, createLabels } from '../helpers/labels'
import {
  LabelEditFormattedItem,
  LabelKeys,
  RepoWithOwnerAndName,
  RepoWithLabelsToAdd,
} from '../types/Labels'
import { AnsBaseRepo, AnsSyncRepo } from '../types/Answers'
import { listRepos } from '../helpers/git'
import { ParseAndHandleError } from '../errors'

const debug = Debug('github:labelSync')

/**
 * format the display list
 *
 * @param Github.IssuesListLabelsForRepoResponseItem[] labels
 * @returns formatted list
 */
const formatList = (
  labels: Github.IssuesListLabelsForRepoResponseItem[],
): LabelEditFormattedItem[] => {
  return labels.map(label => {
    // when adding labels, Github API does not accept null values for label description
    if (label.description === null) {
      label.description = ''
    }
    const { name, description, color } = label
    return {
      name: `${name}`,
      value: {
        name,
        description,
        color,
      },
    }
  })
}

const selectBaseRepoPrompt = (
  repoList: RepoWithOwnerAndName[],
): AutoCompleteQuestion<AnsBaseRepo>[] => [
  {
    type: 'autocomplete',
    name: 'baseRepo',
    message: 'Please select the base repo that you want to sync to.',
    autocomplete: repoList.map(repo => `${repo.owner}/${repo.repo}`),
  },
]

const selectReposToSync = (
  repoList: RepoWithOwnerAndName[],
  baseRepo: string,
): Question<AnsSyncRepo>[] => {
  const filteredRepoList = repoList.filter(
    repo => `${repo.owner}/${repo.repo}` !== baseRepo,
  )
  return [
    {
      type: 'checkbox',
      name: 'reposToSync',
      message: 'Select the repos you wish to sync the labels of.',
      choices: filteredRepoList.map(repo => {
        return {
          name: `${repo.owner}/${repo.repo}`,
          value: {
            owner: repo.owner,
            repo: repo.repo,
          },
        }
      }),
    },
  ]
}

const formatRepoList = (
  repos: Github.AppsListReposResponseRepositoriesItem[],
): RepoWithOwnerAndName[] => {
  return repos.map(repo => {
    return {
      owner: repo.owner.login,
      repo: repo.name,
    }
  })
}

const findRepoObj = (
  repoList: RepoWithOwnerAndName[],
  repoDisplayName: string,
): RepoWithOwnerAndName => {
  return repoList.find(repo => `${repo.owner}/${repo.repo}` === repoDisplayName)
}

const compareLabels = (
  baseList: LabelEditFormattedItem[],
  syncList: LabelEditFormattedItem[],
): LabelKeys[] => {
  const labels: LabelKeys[] = []
  const baseName = baseList.map(label => label.name)
  const syncName = syncList.map(label => label.name)
  baseName.forEach(label => {
    if (!syncName.includes(label)) {
      const labelToAdd = baseList.find(labelObj => label === labelObj.name)
      labels.push(labelToAdd.value)
    }
  })
  return labels
}

export const labelSync = async () => {
  const labelList: RepoWithLabelsToAdd[] = []
  try {
    const github: Github = await getGithub()
    const repos = await listRepos(github)
    const formattedRepoList = formatRepoList(repos)
    const { baseRepo } = await ux.prompt<AnsBaseRepo>(
      selectBaseRepoPrompt(formattedRepoList),
    )
    const { reposToSync } = await ux.prompt<AnsSyncRepo>(
      selectReposToSync(formattedRepoList, baseRepo),
    )
    const { owner, repo } = findRepoObj(formattedRepoList, baseRepo)
    const baseRepoLabelList = await getAllLabelsForRepo(owner, repo, github)
    const formattedBaseRepoLabels = formatList(baseRepoLabelList)
    // Check and consolidate all labels that needed to be added
    await Promise.all(
      reposToSync.map(async repo => {
        try {
          const repoLabelList = await getAllLabelsForRepo(
            repo.owner,
            repo.repo,
            github,
          )
          const formattedRepoLabels = formatList(repoLabelList)
          const labelsToAdd = compareLabels(
            formattedBaseRepoLabels,
            formattedRepoLabels,
          )
          return await labelList.push({
            repo,
            labels: labelsToAdd,
          })
        } catch (err) {
          await ParseAndHandleError(err, 'getAllLabelsForRepo()')
        }
      }),
    )
    // Take missing labels and add them in
    try {
      await Promise.all(
        labelList.map(async syncRepo => {
          const { owner, repo }: RepoWithOwnerAndName = syncRepo.repo
          const { labels } = syncRepo
          if (labels.length > 0) {
            const labelStr = labels.map(
              label => `${ux.colors.hex(label.color)(label.name)}`,
            )
            sdk.log(
              `Adding labels: ${labelStr.join('. ')} to ${owner}/${repo}.`,
            )
          } else {
            sdk.log(
              `${owner}/${repo} already has labels synced with base repo!`,
            )
          }
          return await createLabels(owner, repo, labels, github)
        }),
      )
    } catch (err) {
      debug('create labels failed for selected repos', err)
      await ParseAndHandleError(err, 'createLabels()')
    }
  } catch (err) {
    debug('sync label failed', err)
    await ParseAndHandleError(err, 'label:sync')
  }
}
