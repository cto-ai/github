import { Question, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { getGithub } from '../helpers/getGithub'
import {
  editLabel,
  findReposWithSelectedLabel,
  getAllLabelsForRepo,
} from '../helpers/labels'
import { keyValPrompt } from '../helpers/promptUtils'
import {
  AnsSelectLabelEdit,
  AnsSelectReposForLabel,
  AnsSelectYesNo,
} from '../types/Answers'
import { CommandOptions } from '../types/Config'
import {
  LabelEditFormattedItem,
  LabelKeys,
  RepoWithOwnerAndName,
} from '../types/Labels'
const debug = Debug('github:labelEdit')

let formattedList = []

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

/**
 * Prompt user to select or fuzzy search for label from the labels list
 *
 * @returns {Promise<LabelEditFormattedItemValue>}
 */
const labelSelection = async (): Promise<LabelKeys> => {
  const questions: Question<AnsSelectLabelEdit> = {
    type: 'autocomplete',
    message: 'Choose a label to edit:\n',
    name: 'label',
    choices: [],
  }

  const { label } = await keyValPrompt(questions, formattedList)
  return label
}

const promptLabelEdit = async ({
  name,
  description,
  color,
}: LabelKeys): Promise<LabelKeys> => {
  const questions: Question<LabelKeys>[] = [
    {
      type: 'input',
      name: 'name',
      message: 'Enter a new name for the label:',
      default: name,
      // afterMessage: `${ux.colors.reset.green('✓')} Name`,
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter a new description for the label:',
      default: description,
      // afterMessage: `${ux.colors.reset.green('✓')} Description`,
    },
    {
      type: 'input',
      name: 'color',
      message: 'Enter a new color for the label:',
      default: color,
      // afterMessage: `${ux.colors.reset.green('✓')} Color`,
    },
  ]

  const answers = await ux.prompt<LabelKeys>(questions)
  return answers
}

const promptYesNo = async (): Promise<boolean> => {
  const yesOrNoSelect: Question<AnsSelectYesNo> = {
    type: 'confirm',
    name: 'yesOrNo',
    message:
      'Do you want to edit this label in other repos in the organization as well?',
  }

  const { yesOrNo } = await ux.prompt<AnsSelectYesNo>(yesOrNoSelect)

  return yesOrNo
}

const selectRepos = async (
  filteredRepos: RepoWithOwnerAndName[],
): Promise<RepoWithOwnerAndName[]> => {
  const repoListSelect: Question<AnsSelectReposForLabel> = {
    type: 'checkbox',
    name: 'reposSelected',
    message: 'Select from the list below',
    choices: [],
  }

  const choices = filteredRepos.map(repo => {
    return {
      name: `${repo.owner}/${repo.repo}`,
      value: {
        repo: repo.repo,
        owner: repo.owner,
      },
    }
  })

  const { reposSelected } = await keyValPrompt(repoListSelect, choices)
  return reposSelected
}

export const labelEdit = async (cmdOptions: CommandOptions) => {
  try {
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

    // prompt user to select label that they want to edit
    const selectedLabel = await labelSelection()
    const { name: labelName } = selectedLabel

    const newLabel = await promptLabelEdit(selectedLabel)

    // does the user wish to edit the same label for other repos as well?
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
        // prompt user to select repos in the org for which they want to edit label
        const reposSelected = await selectRepos(filteredRepos)
        // edit labels from the selected repos
        try {
          await Promise.all(
            reposSelected.map(async item => {
              const { owner, repo } = item
              return await editLabel(owner, repo, labelName, newLabel, github)
            }),
          )
          await ux.print(
            `🎉 ${ux.colors.green(
              `Label ${labelName} has been updated in the selected repos.`,
            )}`,
          )
          process.exit()
        } catch (err) {
          debug('edit labels for repos failed', err)
          await ParseAndHandleError(err, 'editLabel()')
        }
      } catch (err) {
        await ux.print(`${err}\n🏃 Updating label in the current repo!`)
        await ParseAndHandleError(err, 'Update label')
      }
    }
    // if user does not wish to edit labels for any other repo
    // edit label for the current repo only
    try {
      await editLabel(
        currentRepoOwner,
        currentRepoName,
        labelName,
        newLabel,
        github,
      )
    } catch (err) {
      debug('edit label failed', err)
      await ParseAndHandleError(err, 'editLabel()')
    }

    await ux.print(
      `🎉 ${ux.colors.green(
        `Label ${labelName} has been updated in the current repo.`,
      )}`,
    )
    process.exit()
  } catch (err) {
    debug('label edit failed', err)
    await ParseAndHandleError(err, 'label:edit')
  }
}
