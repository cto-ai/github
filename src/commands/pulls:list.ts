import { Question, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { getGithub } from '../helpers/getGithub'
import { keyValPrompt } from '../helpers/promptUtils'
import { AnsSelectPull } from '../types/Answers'
import { CommandOptions } from '../types/Config'
import { PullsListValue } from '../types/PullsTypes'

let formattedList: {
  name: string
  value: {
    number: number
    title: string
    url: string
  }
}[] = []

const debug = Debug('github:pullsList')

/**
 * format the display list
 *
 * @param {Github.PullsListResponseItem[]} pulls
 * @returns formatted list
 */
const formatList = (pulls: Github.PullsListResponseItem[]) => {
  return pulls.map(pull => {
    const { number, title, html_url } = pull
    return {
      name: `# ${number} - ${title}`,
      value: {
        number,
        title,
        url: html_url,
      },
    }
  })
}

/**
 * prompt user to select a pull request
 *
 * @returns {Promise<PullsListValue>}
 */
const promptPullRequestSelection = async (
  repo: string,
): Promise<PullsListValue> => {
  const questions: Question<AnsSelectPull> = {
    type: 'autocomplete',
    message: `Here's a list of pull requests for ${repo}:`,
    name: 'pullRequest',
    choices: [],
  }

  const { pullRequest } = await keyValPrompt(questions, formattedList)
  return pullRequest
}

/**
 * list all pull requests for the given repo
 *
 * @param {string} owner
 * @param {string} repo
 * @param {Github} github
 * @returns
 */
const getPullsForRepo = async (owner: string, repo: string, github: Github) => {
  try {
    const { data } = await github.pulls.list({
      owner,
      repo,
    })

    return data
  } catch (e) {
    debug('pull list for repo failed', e)
    await ParseAndHandleError(e, 'List pulls')
  }
}

// main function
export const pullsList = async (cmdOptions: CommandOptions) => {
  try {
    await checkCurrentRepo(cmdOptions)
    const github: Github = await getGithub()
    const { owner, repo } = cmdOptions.currentRepo
    const pulls = await getPullsForRepo(owner, repo, github)

    formattedList = formatList(pulls)
    const { url } = await promptPullRequestSelection(repo)
    await ux.print(
      `\nView the pull request here: 🔗 ${ux.colors.actionBlue(`${url}`)}\n`,
    )
  } catch (err) {
    debug('pulls List failed', err)
    await ParseAndHandleError(err, 'pulls:list')
  }
}
