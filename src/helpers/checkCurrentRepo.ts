const parse = require('parse-git-config')
import { ux, sdk } from '@cto.ai/sdk'
import { CommandOptions } from '../types/Config'
import { execPromisified } from './execPromisified'
import { saveRemoteRepoToConfig } from './saveRemoteRepoToConfig'
import { ParseAndHandleError } from '../errors'

const REPO_OWNER_REGEX = /(?<=github\.com(\/|:))[a-z0-9A-Z]+/g
const REPO_NAME_REGEX = /(?<=github\.com(\/|:)[a-z0-9A-Z]+\/)[a-z0-9A-Z-]+/g

export const filterForRepoInfo = (url: string) => {
  const repoOwnerMatch = url.match(REPO_OWNER_REGEX)
  const repoNameMatch = url.match(REPO_NAME_REGEX)
  if (repoOwnerMatch && repoNameMatch) {
    return {
      owner: repoOwnerMatch[0],
      repo: repoNameMatch[0],
    }
  } else {
    sdk.log(
      `❗️ Failed to parse gitconfig for repo info! Please make sure the repo's remote "origin" is set to a valid Github repo!`,
    )
    process.exit()
  }
}

export const checkCurrentRepo = async (cmdOptions: CommandOptions) => {
  if (!cmdOptions.accessToken) {
    sdk.log(
      `🤔 It seems like you have not configured your Github access token. Please run ${ux.colors.actionBlue(
        'token:update',
      )} to set your access token!`,
    )
    process.exit()
  }
  if (!cmdOptions.currentRepo) {
    try {
      await execPromisified('git remote -v')
      const gitconfig = await parse()
      const originUrl = gitconfig['remote "origin"'].url
      if (!originUrl.includes('github')) {
        sdk.log(
          `❗ This repo's remote "origin" is not currently set for a Github repo`,
        )
        process.exit()
      } else {
        const { owner, repo } = filterForRepoInfo(originUrl)
        const url = await saveRemoteRepoToConfig(owner, repo)
        await execPromisified(`git remote set-url origin ${url}`)
        cmdOptions.currentRepo = { owner, repo }
      }
    } catch (err) {
      await ParseAndHandleError(err, 'checkForRepo()')
    }
  }
}
