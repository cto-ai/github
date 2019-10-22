import { sdk } from '@cto.ai/sdk'
import Debug from 'debug'

const debug = Debug('github:config')

export const getConfig = async key => {
  try {
    return await sdk.getConfig(key)
  } catch (err) {
    debug('failed to get config', err)
    throw err
  }
}

export const setConfig = async (key, value) => {
  try {
    return await sdk.setConfig(key, value)
  } catch (err) {
    debug('failed to set config')
    throw err
  }
}
