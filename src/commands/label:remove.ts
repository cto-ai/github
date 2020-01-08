import { Question, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import * as fuzzy from 'fuzzy'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { getGithub } from '../helpers/getGithub'
import {
  findReposWithSelectedLabel,
  getAllLabelsForRepo,
  removeLabel,
} from '../helpers/labels'
import {
  AnsSelectLabelRemove,
  AnsSelectReposForLabel,
  AnsSelectYesNo,
} from '../types/Answers'
import { CommandOptions } from '../types/Config'
import {
  LabelRemoveFormattedItem,
  LabelRemoveFormattedItemValue,
  RepoWithOwnerAndName,
} from '../types/Labels'

const debug = Debug('github:labelRemove')

let formattedList = []

/**
 * format the display list
 *
 * @param Github.IssuesListLabelsForRepoResponseItem[] labels
 * @returns formatted list
 */
const formatList = (
  labels: Github.IssuesListLabelsForRepoResponseItem[],
): LabelRemoveFormattedItem[] => {
  return labels.map(label => {
    const { name } = label
    return {
      name: `${name}`,
      value: {
        labelName: name,
      },
    }
  })
}

/**
 * Does fuzzy search in the list for the matching characters
 *
 * @param {string} [input='']
 */
const autocompleteSearch = async (_: any, input = '') => {
  const fuzzyResult = await fuzzy.filter<LabelRemoveFormattedItem>(
    input,
    formattedList,
    {
      extract: el => el.name,
    },
  )
  return fuzzyResult.map(result => result.original)
}

/**
 * Prompt user to select or fuzzy search for label from the labels list
 *
 * @returns {Promise<LabelRemoveFormattedItemValue>}
 */
const labelSelection = async (): Promise<LabelRemoveFormattedItemValue> => {
  const questions: Question<AnsSelectLabelRemove> = {
    type: 'autocomplete',
    message: 'Choose a label to remove:\n',
    name: 'label',
    choices: formattedList,
    // source: autocompleteSearch,
    // bottomContent: '',
  }

  const { label } = await ux.prompt<AnsSelectLabelRemove>(questions)
  return label
}

const promptYesNo = async (): Promise<boolean> => {
  const yesOrNoSelect: Question<AnsSelectYesNo> = {
    type: 'confirm',
    name: 'yesOrNo',
    message:
      'Do you want to remove the label from other repos in the organization as well?',
  }

  const { yesOrNo } = await ux.prompt<AnsSelectYesNo>(yesOrNoSelect)

  return yesOrNo
}

const selectRepos = async (
  filteredRepos: RepoWithOwnerAndName[],
): Promise<RepoWithOwnerAndName[]> => {
  let repoKV = filteredRepos.map(repo => {
    return {
      name: `${repo.owner}/${repo.repo}`,
      value: {
        repo: repo.repo,
        owner: repo.owner,
      },
    }
  })
  const repoListSelect: Question<AnsSelectReposForLabel> = {
    type: 'checkbox',
    name: 'reposSelected',
    message: 'Select from the list below',
    choices: repoKV.map(repo => {
      return repo.name
    }),
  }

  const reposSelectedUnmapped: string[] = await ux.prompt(repoListSelect)

  return reposSelectedUnmapped.map((value: string) => {
    return repoKV.find(repoEntry => {
      return repoEntry.name == value
    }).value
  })
  // return reposSelected
}

export const labelRemove = async (cmdOptions: CommandOptions) => {
  await checkCurrentRepo(cmdOptions)
  const github: Github = await getGithub()

  const {
    owner: currentRepoOwner,
    repo: currentRepoName,
  } = cmdOptions.currentRepo

  // list all labels for the repo
  const labels = await getAllLabelsForRepo(
    currentRepoOwner,
    currentRepoName,
    github,
  )

  formattedList = formatList(labels)

  const { labelName } = await labelSelection()

  const yesOrNo = await promptYesNo()

  if (yesOrNo) {
    await ux.print(`Finding repos that has the label ${labelName}...`)
    try {
      // find all repos that has the selected label
      const filteredRepos = await findReposWithSelectedLabel(
        currentRepoOwner,
        labelName,
        github,
      )

      // prompt user to select repos in the org for which they want to remove label
      const reposSelected = await selectRepos(filteredRepos)
      // remove labels from the selected repos
      try {
        await Promise.all(
          reposSelected.map(async item => {
            const { owner, repo } = item
            return await removeLabel(owner, repo, labelName, github)
          }),
        )
      } catch (err) {
        debug('remove labels for repos failed', err)
        await ParseAndHandleError(err, 'Label removed from organzation repos')
      }

      await ux.print(
        `🎉 ${ux.colors.green(
          'Label has been removed from the selected repos.',
        )}`,
      )
      process.exit()
    } catch (err) {
      await ParseAndHandleError(err, 'Finding label from Organization')
    }
  }

  // if user does not wish to remove labels from any other repo
  // delete label from only the current repo
  try {
    await removeLabel(currentRepoOwner, currentRepoName, labelName, github)
  } catch (err) {
    debug('remove label failed', err)
    await ParseAndHandleError(err, 'label:remove')
  }
  await ux.print(
    `🎉 ${ux.colors.green('Label has been removed from the current repo.')}`,
  )
  process.exit()
}
