import * as Github from '@octokit/rest'
import Debug from 'debug'
import { ParseAndHandleError } from '../errors'
import { execPromisified } from '../helpers/execPromisified'

const debug = Debug('github:gitHelpers')

export const checkForRemoteBranch = async branchName => {
  let remoteBranches
  try {
    remoteBranches = await execPromisified(`git branch -r`)
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'checkForRemoteBranch()')
  }

  return remoteBranches.stdout.indexOf(branchName) !== -1
}

export const checkForLocalBranch = async branchName => {
  let localBranches
  try {
    localBranches = await execPromisified(`git branch`)
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'checkForLocalBranch()')
  }

  return localBranches.stdout.indexOf(branchName) !== -1
}

export const makeInitialCommit = async (repoName?: string) => {
  try {
    if (repoName) {
      await execPromisified(
        `cd ${repoName} && git commit --allow-empty -m 'initial commit' && git push`,
      )
      return true
    }
    await execPromisified(`git commit --allow-empty -m 'initial commit'`)
    return true
  } catch (err) {
    debug('make initial commit failed', err)
    await ParseAndHandleError(err, 'makeInitialCommit()')
  }
}

export const checkLocalChanges = async () => {
  try {
    const response = await execPromisified(`git status --porcelain`)
    if (response.stdout !== '') {
      return true
    }

    return false
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'checkLocalChanges()')
  }
}

export const assignLabels = async (
  github: Github,
  owner: string,
  repo: string,
  issue_number: number,
  labels: string[],
) => {
  try {
    await github.issues.removeLabels({
      owner,
      repo,
      issue_number,
    })
    await github.issues.addLabels({
      owner: owner,
      repo: repo,
      issue_number,
      labels,
    })
  } catch (err) {
    debug('assign labels failed', err)
    await ParseAndHandleError(err, 'assignLabels()')
  }
}

// execute git clone
export const cloneRepo = async urlWithToken => {
  try {
    await execPromisified(`git clone ${urlWithToken}`)
  } catch (err) {
    debug('clone repo failed', err)
    await ParseAndHandleError(err, 'cloneRepo()')
  }
}

export const hasIssueEnabled = async (
  owner: string,
  repo: string,
  github: Github,
): Promise<boolean> => {
  try {
    const {
      data: { has_issues },
    } = await github.repos.get({
      owner,
      repo,
    })
    return has_issues
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'Checking if repo has issues enabled.')
  }
}

export const listRepos = async (
  github: Github,
): Promise<Github.AppsListReposResponseRepositoriesItem[]> => {
  try {
    const { data } = await github.repos.list({
      type: 'all',
    })
    return data
  } catch (err) {
    debug('list repo for users failed', err)
    await ParseAndHandleError(err, 'listRepos()')
  }
}

export const listReposForOrg = async (
  owner: string,
  github: Github,
): Promise<Github.ReposListForOrgResponseItem[]> => {
  try {
    const { data: repos } = await github.repos.listForOrg({
      org: owner,
    })
    return repos
  } catch (err) {
    debug('list repo for orgs failed', err)
    await ParseAndHandleError(err, 'listForOrg()')
  }
}
