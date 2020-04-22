import { Question, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import { ParseAndHandleError } from '../errors'
import { getGithub } from '../helpers/getGithub'
import { listRepos } from '../helpers/git'
import { createLabels, getAllLabelsForRepo } from '../helpers/labels'
import { keyValPrompt } from '../helpers/promptUtils'
import { AnsBaseRepo } from '../types/Answers'
import {
  LabelEditFormattedItem,
  LabelKeys,
  RepoWithLabelsToAdd,
  RepoWithOwnerAndName,
} from '../types/Labels'

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
): Question<AnsBaseRepo>[] => [
  {
    type: 'autocomplete',
    name: 'baseRepo',
    message: 'Please select the base repo that you want to sync to.',
    choices: repoList.map(repo => `${repo.owner}/${repo.repo}`),
  },
]

const selectReposToSync: Question = {
  type: 'checkbox',
  name: 'reposToSync',
  message: 'Select the repos you wish to sync the labels of.',
  choices: [],
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
    const { reposToSync } = await keyValPrompt(
      selectReposToSync,
      formattedRepoList
        .filter(repo => `${repo.owner}/${repo.repo}` !== baseRepo)
        .map(repo => {
          return {
            name: `${repo.owner}/${repo.repo}`,
            value: {
              owner: repo.owner,
              repo: repo.repo,
            },
          }
        }),
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
            await ux.print(
              `Adding labels: ${labelStr.join('. ')} to ${owner}/${repo}.`,
            )
          } else {
            await ux.print(
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
