import { Question, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { getGithub } from '../helpers/getGithub'
import { createLabels } from '../helpers/labels'
import { validatedPrompt } from '../helpers/promptUtils'
import { AnsSelectReposForLabel, AnsSelectYesNo } from '../types/Answers'
import { CommandOptions } from '../types/Config'
import { LabelKeys } from '../types/Labels'

const debug = Debug('github:labelAdd')

const promptUserInput = async () => {
  const questions: Question<LabelKeys>[] = [
    {
      type: 'input',
      name: 'name',
      message: `\nPlease enter your label name:`,
    },
    {
      type: 'input',
      name: 'description',
      message: `\nPlease enter your label description:`,
    },
    {
      type: 'input',
      name: 'color',
      message: `\nProvide a valid hex code for your label color (without #):`,
    },
  ]

  const answers = await validatedPrompt(
    questions,
    (response: any) => {
      if (response[questions[1].name].length > 100) {
        // errMess = ' Label description must be under 100 characters in length!'
        return false
      } else if (!isValidColor(response[questions[2].name])) {
        // errMess = ' That is not a valid hex code!'
        return false
      }
      return true
    },
    'Label description must be under 100 characters in length, and colour must be a valid hex code!',
  )
  return answers
}

/*
 * checks that a string is a valid hex color code without the preceding `#`
 */
const isValidColor = color => {
  const validColor = /^([0-9A-F]{3}$|[0-9A-F]{6}$)/i
  return validColor.test(color)
}

export const labelAdd = async (cmdOptions: CommandOptions) => {
  try {
    await checkCurrentRepo(cmdOptions)

    const github: Github = await getGithub()

    const { name, description, color } = await promptUserInput()

    const { owner, repo } = cmdOptions.currentRepo

    const labelArr = [
      {
        name,
        description,
        color,
      },
    ]

    const yesOrNoSelect: Question<AnsSelectYesNo> = {
      type: 'confirm',
      name: 'yesOrNo',
      message:
        'Do you want to add the label to other repos in the organization as well?',
    }

    const { yesOrNo } = await ux.prompt<AnsSelectYesNo>(yesOrNoSelect)

    if (yesOrNo) {
      // list repos for the orgs
      let repos = []
      try {
        const { data } = await github.repos.listForOrg({
          org: owner,
        })
        repos = data
      } catch (err) {
        debug('list repo for orgs failed', err)
        await ParseAndHandleError(err, 'listForOrg()')
      }

      if (repos.length > 0) {
        let repoKV = repos.map(repo => {
          return {
            name: repo.name,
            value: {
              repo: repo.name,
              owner: repo.owner.login,
            },
          }
        })
        const repoListSelect: Question<AnsSelectReposForLabel> = {
          type: 'checkbox',
          name: 'reposSelected',
          message: 'Select from the list below',
          choices: repoKV.map(val => {
            return val.name
          }),
        }
        const reposSelectedUnmapped: string[] = await ux.prompt(repoListSelect)
        const reposSelected = reposSelectedUnmapped.map(value => {
          return repoKV[value]
        })

        try {
          await Promise.all(
            reposSelected.map(async item => {
              const { owner, repo } = item
              return await createLabels(owner, repo, labelArr, github)
            }),
          )
        } catch (err) {
          debug('create labels failed for selected repos', err)
          await ParseAndHandleError(err, 'createLabels()')
        }

        await ux.print(
          `🎉 ${ux.colors.green(
            'Label has been added to the selected repos.',
          )}`,
        )
        process.exit()
      }
    }
    try {
      await createLabels(owner, repo, labelArr, github)
    } catch (err) {
      debug('create labels failed', err)
      await ParseAndHandleError(err, 'createLabels()')
    }

    await ux.print(`🎉 ${ux.colors.green('Label has been added.')}`)
    process.exit()
  } catch (err) {
    debug('label add failed', err)
    await ParseAndHandleError(err, 'label:add')
  }
}
