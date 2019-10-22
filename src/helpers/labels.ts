import * as Github from '@octokit/rest'
import Debug from 'debug'
import { RepoLabel } from '../types/RepoTypes'
import { LabelKeys, RepoWithOwnerAndName } from '../types/Labels'
import { listReposForOrg } from '../helpers/git'
import { ParseAndHandleError } from '../errors'

const debug = Debug('github:labelHelper')
/**
 * Adds labels to the repo
 *
 * @param {string} owner repo owner
 * @param {string} repo repo name
 * @param {array} labels repo labels to be added
 * @param {Github} github github instance
 * @returns
 */
export const createLabels = async (
  owner: string,
  repo: string,
  labels: RepoLabel[],
  github: Github,
) => {
  return await Promise.all(
    labels.map(async label => {
      const { name, color, description } = label

      try {
        const response = await github.issues.createLabel({
          owner,
          repo,
          name,
          color,
          description,
        })
        return response
      } catch (err) {
        await ParseAndHandleError(err, 'createLabel()', name, repo)
      }
    }),
  )
}

/**
 * Get a single label from repo by name
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} label
 * @param {Github} github
 * @returns {Promise<Github.IssuesGetLabelResponse>}
 */
export const getLabel = async (
  owner: string,
  repo: string,
  label: string,
  github: Github,
): Promise<Github.IssuesGetLabelResponse> => {
  try {
    const { data } = await github.issues.getLabel({
      owner,
      repo,
      name: label,
    })
    return data
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'getLabel()', label)
  }
}
/**
 * List all the labels for the repo
 *
 * @param {string} owner: repo owner
 * @param {string} repo: repo name
 * @param {Github} github: github instance
 * @returns {Promise<Github.IssuesListLabelsForRepoResponseItem[]>}
 */
export const getAllLabelsForRepo = async (
  owner: string,
  repo: string,
  github: Github,
): Promise<Github.IssuesListLabelsForRepoResponseItem[]> => {
  try {
    const { data: labels } = await github.issues.listLabelsForRepo({
      owner,
      repo,
    })
    return labels
  } catch (err) {
    debug('list labels for repo failed', err)
  }
}

export const removeLabel = async (
  owner: string,
  repo: string,
  labelName: string,
  github: Github,
) => {
  return await github.issues.deleteLabel({
    owner,
    repo,
    name: labelName,
  })
}

export const editLabel = async (
  owner: string,
  repo: string,
  currentName: string,
  newLabel: LabelKeys,
  github: Github,
) => {
  const { name, description, color } = newLabel
  try {
    const response = await github.issues.updateLabel({
      owner,
      repo,
      current_name: currentName,
      name,
      description,
      color,
    })
    return response
  } catch (err) {
    debug('edit failed', err)
    await ParseAndHandleError(err, 'editLabel()')
  }
}

export const findReposWithSelectedLabel = async (
  owner: string,
  labelName: string,
  github: Github,
): Promise<RepoWithOwnerAndName[]> => {
  try {
    // Step1:  list all repos for the orgs
    const repos = await listReposForOrg(owner, github)
    if (repos) {
      // Step2: list all repos which have the given label if repos exist
      const reposWithLabel = await Promise.all(
        // using map instead of filter because filter is a synchronous function
        // filter does not work with Promise.all
        // therefore using filter in the next step
        repos.map(async item => {
          const {
            owner: { login },
            name: repoName,
          }: {
            owner: Github.ReposListForOrgResponseItemOwner
            name: string
          } = item

          // getLabels
          const data = await getLabel(login, repoName, labelName, github)
          if (data) return { repo: item.name, owner: item.owner.login }
          return undefined
        }),
      )
      // filter out undefined values in the array
      const filteredRepos = reposWithLabel.filter(el => el !== undefined)
      return filteredRepos
    } else {
      return undefined
    }
  } catch (err) {
    debug('find repos failed', err)
    await ParseAndHandleError(err, 'findReposWithSelectedLabel()')
  }
}
