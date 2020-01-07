import { Question } from '@cto.ai/inquirer'
import { sdk, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import * as fuzzy from 'fuzzy'
import { ParseAndHandleError } from '../errors'
import { getConfig } from '../helpers/config'
import { getGithub } from '../helpers/getGithub'
import { isRepoCloned } from '../helpers/isRepoCloned'
import { AnsIssueList } from '../types/Answers'
import { IssueListFuzzy, IssueListValue } from '../types/IssueTypes'

const debug = Debug('github:issueList')

let formattedList = []

const formatListRepo = (issues: Github.IssuesListForRepoResponse) => {
  return issues.map(issue => {
    const { number, title } = issue
    return {
      name: `# ${number} - ${title}`,
      value: {
        number,
        title,
      },
    }
  })
}
const formatListAll = (issues: Github.IssuesListResponse) => {
  return issues.map(issue => {
    const { number, title, repository } = issue
    const {
      name,
      owner: { login },
    } = repository
    return {
      name: `${login} - ${name} -> # ${number} - ${title}`,
      value: {
        number,
        title,
        repoName: name,
        repoOwner: login,
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
  const fuzzyResult = await fuzzy.filter<IssueListFuzzy>(input, formattedList, {
    extract: el => el.name,
  })
  return fuzzyResult.map(result => result.original)
}

const promptIssueSelection = async (): Promise<IssueListValue> => {
  const question: Question<AnsIssueList> = {
    type: 'autocomplete',
    message: `\nHere are a list of issues: \n${ux.colors.reset(
      `🔍 Start work on an issue by running 'ops issue:start'!`,
    )}\n`,
    name: 'issue',
    source: autocompleteSearch,
    bottomContent: '',
  }
  const { issue } = await ux.prompt<AnsIssueList>(question)
  return issue
}

const getIssuesForRepo = async (
  owner: string,
  repo: string,
  github: Github,
): Promise<Github.IssuesListForRepoResponse> => {
  try {
    const { data } = await github.issues.listForRepo({
      owner,
      repo,
    })

    const filteredIssues = data.filter(issue => {
      return !issue.pull_request
    })

    return filteredIssues
  } catch (e) {
    debug('issue list for repo failed', e)
    await ParseAndHandleError(e, 'listForRepo()')
  }
}

const getIssuesAll = async (
  github: Github,
): Promise<Github.IssuesListResponse> => {
  try {
    // list all issues
    const { data } = await github.issues.list({ filter: 'all' })
    const filteredIssues = data.filter(issue => {
      return !issue.pull_request
    })
    return filteredIssues
  } catch (e) {
    debug('issue list failed', e)
    await ParseAndHandleError(e, 'listIssues()')
  }
}

export const issueList = async ({ currentRepo }) => {
  try {
    const github: Github = await getGithub()

    if (currentRepo) {
      // list issues specific to the repo
      const { owner, repo } = currentRepo
      const issues = await getIssuesForRepo(owner, repo, github)

      // check if issues exist
      if (!issues || !issues.length) {
        sdk.log(`\n❌ There are no issues. Create one with 'issue:create'.\n`)
        process.exit()
      }

      // format list for repo specific issues
      formattedList = formatListRepo(issues)
      const { number, title } = await promptIssueSelection()
      sdk.log(
        `\n✅ Run '$ ops run github issue:start' to get started with the issue '# ${number} - ${title}'.\n`,
      )
      process.exit()
    }

    // if cuurent repo is undefined, list all issues
    const issues = await getIssuesAll(github)

    // check if issues exist
    if (!issues || !issues.length) {
      sdk.log(`❌ There are no issues. Create one with 'issue:create'.`)
      process.exit()
    }

    formattedList = formatListAll(issues)
    const { repoOwner, repoName } = await promptIssueSelection()

    const remoteRepos = (await getConfig('remoteRepos')) || []
    if (isRepoCloned(repoOwner, repoName, remoteRepos)) {
      sdk.log(
        `\n✅ cd ${repoName} and use command 'ops run github issue:start' to get started with the issue.\n`,
      )
      process.exit()
    }
    sdk.log(
      `\n🤖 Repo ${repoName} is not yet cloned. Clone the repo using command repo:clone and then use issue:start to get started on the issue.\n`,
    )
  } catch (err) {
    debug('issue:list failed', err)
    await ParseAndHandleError(err, 'issue:list')
  }
}
