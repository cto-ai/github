import Debug from 'debug'

import { getConfig, setConfig } from './config'
import { ParseAndHandleError } from '../errors'

const debug = Debug('github:saveToConfig')

/**
 * save remote repo to config
 * @param owner repo owner
 * @param name repo name
 */
export const saveRemoteRepoToConfig = async (owner, name): Promise<string> => {
  try {
    const oldRemoteRepos = (await getConfig('remoteRepos')) || []
    const accessToken = await getConfig('accessToken')
    const url = `https://${accessToken}@github.com/${owner}/${name}.git`
    const remoteRepos = [
      ...oldRemoteRepos,
      {
        owner,
        repo: name,
        url,
      },
    ]
    await setConfig('remoteRepos', remoteRepos)
    return url
  } catch (err) {
    debug('save remote to config failed', err)
    ParseAndHandleError(err, 'saveRemoteRepoToConfig()')
  }
}
