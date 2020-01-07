import { Question } from '@cto.ai/inquirer'
import { sdk, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import branch from 'git-branch'
import { LABELS } from '../constants'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { getGithub } from '../helpers/getGithub'
import { AnsPullRequest, AnsSelectContributor, AnsSelectYesNo } from '../types/Answers'
import { CommandOptions } from '../types/Config'
const debug = Debug('github:issueDone')

const pullRequestQuestions: Question<AnsPullRequest>[] = [
  {
    type: 'input',
    name: 'title',
    message: 'Enter a title for the Pull Request:',
    afterMessage: `${ux.colors.reset.green('✓')} Title`,
  },
  {
    type: 'input',
    name: 'comment',
    message: 'Enter a comment or description for your Pull Request',
    afterMessage: `${ux.colors.reset.green('✓')} Comment`,
  },
]

const promptForReviewers = async (): Promise<boolean> => {
  const { yesOrNo } = await ux.prompt<AnsSelectYesNo>({
    type: 'confirm',
    name: 'yesOrNo',
    message: 'Do you want to add reviewers to your pull-request?',
  })
  return yesOrNo
}

const listRepoContributors = async (
  owner: string,
  repo: string,
  github: Github,
) => {
  try {
    const { data } = await github.repos.listContributors({
      owner,
      repo,
    })

    return data.map(item => item.login)
  } catch (err) {
    await ParseAndHandleError(err, 'listRepoContributors()')
  }
}

const selectContributor = async contributorsArr => {
  const { contributors } = await ux.prompt<AnsSelectContributor>({
    type: 'checkbox',
    name: 'contributors',
    message: `${ux.colors.reset('Select from the list or reviewers below:')}`,
    choices: contributorsArr.map(item => {
      return {
        name: `${item}`,
        value: {
          name: item,
        },
      }
    }),
  })

  return contributors
}

const createComment = async (github, owner, repo, issueNum, selected) => {
  let users = ''
  for (let val of selected) {
    users += `@${val.name}, `
  }

  // create comment
  try {
    return await github.issues.createComment({
      owner,
      repo,
      issue_number: issueNum,
      body: `${users} can you please review my PR?`,
    })
  } catch (err) {
    debug('creating comment failed', err)
    await ParseAndHandleError(err, 'createComment()')
  }
}

export const issueDone = async (cmdOptions: CommandOptions) => {
  try {
    await checkCurrentRepo(cmdOptions)
    const github = await getGithub()
    const { owner, repo } = cmdOptions.currentRepo
    const currentBranch = await branch()

    if (currentBranch === 'master') {
      sdk.log(
        `\n❌ Sorry, you cannot create a pull request with master as head. Checkout to a feature branch.\n`,
      )
      process.exit()
    }

    // get user to extract the issue number from currentBranch
    const {
      data: { login },
    } = await github.users.getAuthenticated()
    const issue_number = currentBranch.split('-')[0]
    const RESOLVE_STR = `Resolves #${issue_number}. `
    const { title, comment } = await ux.prompt<AnsPullRequest>(
      pullRequestQuestions,
    )
    let url
    try {
      const {
        data: { html_url },
      } = await github.pulls.create({
        owner,
        repo,
        title,
        body: `${RESOLVE_STR}${comment}`,
        head: currentBranch,
        base: 'master',
      })
      url = html_url
    } catch (err) {
      await ParseAndHandleError(err, 'Creating Pull Request')
    }
    try {
      await Promise.all([
        github.issues.removeLabel({
          owner,
          repo,
          issue_number,
          name: LABELS.PM_DOING.name,
        }),
        github.issues.addLabels({
          owner: owner,
          repo: repo,
          issue_number,
          labels: [LABELS.PM_REVIEW.name],
        }),
      ])
    } catch (err) {
      await ParseAndHandleError(
        err,
        'Remove and Add Labels',
        LABELS.PM_DOING.name,
      )
    }

    const confirmForReviewers = await promptForReviewers()
    if (confirmForReviewers) {
      const contributorsArr = await listRepoContributors(owner, repo, github)
      const selected = await selectContributor(contributorsArr)
      await createComment(github, owner, repo, issue_number, selected)
    }
    sdk.log(
      `\n🎉 Successfully created your pull-request! \n➡️  You can find it here: ${ux.colors.callOutCyan(
        url,
      )}\n`,
    )
  } catch (err) {
    debug('Sorry, we were unable to create a PullRequest.', err)
    await ParseAndHandleError(err, 'issue:done')
  }
}
