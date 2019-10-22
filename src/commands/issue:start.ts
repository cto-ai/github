import { sdk, ux } from '@cto.ai/sdk'
import Debug from 'debug'
import { CommandOptions } from '../types/Config'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { execPromisified } from '../helpers/execPromisified'
import { getGithub } from '../helpers/getGithub'
import { LABELS } from '../constants'
import { checkForLocalBranch, makeInitialCommit } from '../helpers/git'
import { Question } from '@cto.ai/inquirer'
import { AnsSelectIssueStart } from '../types/Answers'
import { ParseAndHandleError } from '../errors'

const debug = Debug('github:issueStart')

export const issueStart = async (cmdOptions: CommandOptions) => {
  await checkCurrentRepo(cmdOptions)
  const github = await getGithub()
  let issues
  const { owner, repo } = cmdOptions.currentRepo
  try {
    const { data } = await github.issues.listForRepo({
      owner,
      repo,
    })
    issues = data
  } catch (e) {
    debug('FAILED TO LIST ISSUES', e)
    await ParseAndHandleError(e, 'Listing issues for Repo')
  }
  const filteredIssues = issues.filter(issue => {
    return !issue.pull_request
  })

  if (!filteredIssues || !filteredIssues.length) {
    sdk.log(`\n❌ There are no issues. Create one with 'issue:create'.\n`)
    return
  }

  const questions: Question<AnsSelectIssueStart> = {
    type: 'list',
    message: 'Select an issue to start:\n',
    name: 'issue',
    choices: filteredIssues.map(issue => {
      return {
        name: `# ${issue.number} - ${issue.title}`,
        value: {
          number: issue.number,
          title: issue.title,
        },
      }
    }),
  }

  const answers = await ux.prompt<AnsSelectIssueStart>(questions)
  const { issue } = answers

  // get user to name the branch with the current user
  const {
    data: { login },
  } = await github.users.getAuthenticated()

  const branchName = `${login}-${issue.number}-${issue.title.replace(' ', '-')}`

  const hasLocalBranch = await checkForLocalBranch(branchName)

  try {
    await Promise.all([
      github.issues.removeLabel({
        owner,
        repo,
        issue_number: issue.number,
        name: LABELS.PM_TASKS.name,
      }),
      github.issues.addLabels({
        owner: owner,
        repo: repo,
        issue_number: issue.number,
        labels: [LABELS.PM_DOING.name],
      }),
    ])
  } catch (err) {
    debug('issue start failed', err)
    await ParseAndHandleError(err, 'Remove and Add Labels', LABELS.PM_TASKS.name)
  }

  try {
    if (!hasLocalBranch) {
      await execPromisified(`git checkout -b ${branchName}`)
      await makeInitialCommit()
    } else {
      await execPromisified(`git checkout ${branchName}`)
    }
  } catch (err) {
    await ParseAndHandleError(err, 'Local git branch creation/checkout')
  }
  sdk.log(
    `\n🙌 Issue ${ux.colors.callOutCyan(
      `# ${answers.issue.number} - ${answers.issue.title}`,
    )} has been checked out and read to be worked on.\nUse ${ux.colors.callOutCyan(
      'ops run github issue:save',
    )} to commit & push.\n`,
  )
}
