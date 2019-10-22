import { run, cleanup, sleep } from '../utils/cmd'
import { GITHUB_TEST_TOKEN } from '../utils/constants'
import { UP, DOWN, ENTER, SPACE, A } from '../utils/constants'
import { getGithub } from '../../src/helpers/getGithub'
import { getConfig, setConfig } from '../../src/helpers/config'
import { execPromisified } from '../../src/helpers/execPromisified'
import { sdk } from '@cto.ai/sdk'

beforeAll(async () => {
  await setConfig('accessToken', GITHUB_TEST_TOKEN)
})

afterAll(async () => {
  await cleanup('repo:create')
})

describe('repo:create happy path', () => {
  test(
    'should successfully create repo in github',
    async () => {
      const result = await run({
        args: ['repo:create'],
        inputs: [ENTER, A, ENTER, A, ENTER, ENTER, ENTER],
        timeout: 8000,
      })
      await sleep(2000)

      await expect(result).toContain(
        'Please select the organization of your repo',
      )
      await expect(result).toContain('Please enter the name of the repo')
      await expect(result).toContain('Successfully created repo')
      await expect(result).toContain('done!')
    },
    1000 * 60 * 3,
  )
})
