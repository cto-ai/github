import { RemoteRepo } from '../types/Config'

/**
 * Finds if the repo is cloned or not
 * @param {string} onwerLogin
 * @param {string} repoName
 * @param {RemoteRepo[]} remoteRepos
 * @returns {boolean}
 */
export const isRepoCloned = (
  onwerLogin: string,
  repoName: string,
  remoteRepos: RemoteRepo[],
): boolean => {
  for (let item of remoteRepos) {
    if (item.owner === onwerLogin && item.repo === repoName) return true
  }
  return false
}
