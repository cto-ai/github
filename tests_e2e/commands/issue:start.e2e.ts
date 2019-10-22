import { run, cleanup } from '../utils/cmd'
import { GITHUB_TEST_TOKEN, GITHUB_TEST_REPO_URL } from '../utils/constants'
import { UP, DOWN, ENTER, SPACE, A, Q, COLON } from '../utils/constants'
import { getGithub } from '../../src/helpers/getGithub'
import { getConfig, setConfig } from '../../src/helpers/config'
import { execPromisified } from '../../src/helpers/execPromisified'
import parse from 'parse-git-config'
import { filterForRepoInfo } from '../../src/helpers/checkCurrentRepo'
import { checkForLocalBranch } from '../../src/helpers/git'

beforeAll(async () => {
  await setConfig('accessToken', GITHUB_TEST_TOKEN)
})

afterAll(async () => {
  await cleanup('issue:start')
})
describe('issue:start happy path', () => {
  test(
    'should checkout new branch',
    async () => {
      await run({
        args: ['repo:clone'],
        inputs: [ENTER, ENTER],
        timeout: 8000,
      })

      process.chdir('testgh')

      await run({
        args: ['issue:create'],
        inputs: [A, ENTER, ENTER, ENTER, COLON, Q, ENTER, ENTER],
        timeout: 10000,
      })

      await run({
        args: ['issue:start'],
        inputs: [ENTER],
        timeout: 10000,
      })

      const hasLocalBranch = await checkForLocalBranch('-')
      expect(hasLocalBranch).toBeTruthy()
    },
    1000 * 60 * 3,
  )
})
