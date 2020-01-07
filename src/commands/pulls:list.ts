import { Question, sdk, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import * as fuzzy from 'fuzzy'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { getGithub } from '../helpers/getGithub'
import { AnsSelectPull } from '../types/Answers'
import { CommandOptions } from '../types/Config'
import { PullsListFuzzy, PullsListValue } from '../types/PullsTypes'

let formattedList = []

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
 * Does fuzzy search in the list for the matching characters
 *
 * @param {string} [input='']
 */
const autocompleteSearch = async (_: any, input = '') => {
  const fuzzyResult = await fuzzy.filter<PullsListFuzzy>(input, formattedList, {
    extract: el => el.name,
  })
  return fuzzyResult.map(result => result.original)
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
    source: autocompleteSearch,
    bottomContent: '',
  }

  const { pullRequest } = await ux.prompt<AnsSelectPull>(questions)
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
    sdk.log(
      `\nView the pull request here: 🔗 ${ux.colors.actionBlue(`${url}`)}\n`,
    )
  } catch (err) {
    debug('pulls List failed', err)
    await ParseAndHandleError(err, 'pulls:list')
  }
}
