import { sdk, ux } from '@cto.ai/sdk'
import { setConfig } from '@cto.ai/sdk/dist/sdk'
import { CREDS_ERROR_MSG, NOT_GIT_REPO_ERROR_MSG, NO_CMD_ERROR_MSG } from './constants'
export * from './credentials'

const ERROR_TAGS = ['github', 'error handler']
const { actionBlue, callOutCyan, secondary } = ux.colors

export const ParseAndHandleError = async (
  err: any,
  command: string,
  labelName?: string,
  repoName?: string,
) => {
  await sdk.track(ERROR_TAGS, {
    event: `Github Op running ${command}`,
    error: err.message,
  })
  if (!err || !err.message) return

  const errorMessage = err.message.toLowerCase()
  if (errorMessage.includes(CREDS_ERROR_MSG.toLowerCase())) {
    sdk.log(
      "😢 Looks like you're using an invalid token. Try running token:update to update your token",
    )
    // This removes the invalid token from the config
    // It prevents a deadlock scenario where the user
    // cannot update their config
    await setConfig('accessToken', '')
    process.exit()
  } else if (errorMessage.includes(NOT_GIT_REPO_ERROR_MSG)) {
    sdk.log(
      `This directory is not a git repository, please run ${actionBlue(
        'repo:create',
      )} or ${actionBlue('repo:clone')} to get started!`,
    )
    process.exit()
  } else if (errorMessage.includes(NO_CMD_ERROR_MSG)) {
    sdk.log(`✋ Sorry, we didn't recognize ${command} as a valid command!`)
    process.exit()
  } else if (
    err.status &&
    err.status === 404 &&
    command === 'Remove and Add Labels'
  ) {
    sdk.log(`😅 This issue did not contain the label ${labelName}!`)
  } else if (err.status && err.status === 404 && command === 'listForOrg()') {
    sdk.log(`😅 This repo does not belong to any organizations!`)
    process.exit()
  } else if (err.status && err.status === 404 && command === 'getLabel()') {
    sdk.log(`😅 The label ${labelName} does not exist for this repo!`)
    process.exit()
  } else if (err.status && err.status === 404) {
    await ux.print(err)
    sdk.log(
      `😅 This Github repo either does not exist, or you do not have user permissions to access this repo's details!`,
    )
    process.exit()
  } else if (err.status && err.status === 410) {
    sdk.log(
      `The repo you are trying to access is moved. Refer to the error message for more details: ${err.message}`,
    )
    process.exit()
  } else if (err.status && err.status === 422 && command === 'createLabel()') {
    sdk.log(
      `❌ Label ${labelName} already exists in the repo ${repoName}! Create a label with a different name!`,
    )
    process.exit()
  } else if (
    err.status &&
    err.status === 422 &&
    command === 'Creating Pull Request'
  ) {
    await ux.print(err)
    sdk.log(
      `❌ Creating pull request failed due to validation error. \n🏷  Make sure to commit and push code using ${callOutCyan(
        'issue:save',
      )} before using ${secondary('issue:done')}!\n`,
    )
    process.exit()
  } else if (command === 'createLabel()') {
    sdk.log(
      `😅 Sorry, failed to create ${labelName} in repo ${repoName}. Refer to ${errorMessage} for more details.`,
    )
    process.exit()
  } else {
    // base case
    await ux.print(err)
    // process.exit()
  }
}
