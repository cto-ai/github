import Github from '@octokit/rest'
import Debug from 'debug'
import { CredentialsError, ParseAndHandleError } from '../errors'
import { getConfig } from './config'


const debug = Debug('github:getGithub')

export const getToken = async () => {
  const accessToken = await getConfig('accessToken')
  return accessToken
}

export const getGithub = async (): Promise<Github> => {
  const token = await getToken()
  try {
    // Previews provided for issue workaround: https://github.com/octokit/rest.js/issues/1141
    const github = new Github({
      auth: token,
      previews: ['symmetra'],
    })

    // Some cases will throw a Bad credentials error by default
    // Some cases will only return undefined
    // A throw and immediate catch seems redundant, but it is the most
    // consistent method without repeating code
    const userInfo = await github.users.getAuthenticated()
    if (!userInfo.data) throw new CredentialsError()

    return github
  } catch (err) {
    await ParseAndHandleError(err, 'getGithub()')
    debug('Authentication error', err)
  }
}
