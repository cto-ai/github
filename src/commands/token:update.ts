import { Question } from '@cto.ai/inquirer'
import { ux } from '@cto.ai/sdk'
import Debug from 'debug'
import { ParseAndHandleError } from '../errors'
import { setConfig } from '../helpers/config'
import { AnsToken } from '../types/Answers'

const debug = Debug('github:tokenUpdate')

export const promptForToken = async () => {
  const question: Question<AnsToken> = {
    type: 'password',
    name: 'token',
    message: `\n${ux.colors.actionBlue(
      '➡️  A Github access token is required to run commands. Follow the steps below to create a Github access token:',
    )}\n\n${ux.colors.white(
      `• Follow the link below to create an access token. For detailed instructions, please refer to the link provided in the README.md! \n 🔗 ${ux.colors.multiPurple(
        'https://github.com/settings/tokens/new',
      )}. \n\n• Remember to select ${ux.colors.multiPurple(
        `'repo'`,
      )} and ${ux.colors.multiPurple(
        `'admin'`,
      )} scopes to grant to this access token.\n\n• Copy the access token and provide it below 👇.`,
    )} \n\n\n🔑 Please enter your github token:`,
    // afterMessage: `${ux.colors.reset.green('✓')} Access Token`,
    // afterMessageAppend: `${ux.colors.reset(' added!')}`,
    validate: (input: string) =>
      !!input.trim() || 'Please enter a valid Github Access Token',
  }
  return await ux.prompt<AnsToken>(question)
}

export const updateAccessToken = async () => {
  try {
    const answers = await promptForToken()
    await setConfig('accessToken', answers.token)
  } catch (err) {
    debug('update access token failed', err)
    await ParseAndHandleError(err, 'token:update')
  }
}
