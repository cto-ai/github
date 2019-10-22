import { run, cleanup } from '../utils/cmd'
import { GITHUB_TEST_TOKEN } from '../utils/constants'
import { ENTER } from '../utils/constants'
import { setConfig } from '../../src/helpers/config'

beforeAll(async () => {
  await setConfig('accessToken', GITHUB_TEST_TOKEN)
})

afterAll(async () => {
  await cleanup('repo:clone')
})

describe('repo:clone happy path', () => {
  test(
    'should successfully clone repo from github',
    async () => {
      const result = await run({
        args: ['repo:clone'],
        inputs: [ENTER, ENTER],
        timeout: 8000,
      })

      await expect(result).toContain('Successfully cloned repo!')
    },
    1000 * 60 * 3,
  )
})
