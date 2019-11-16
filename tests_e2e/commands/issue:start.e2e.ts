import { run, cleanup, signin } from '../utils/cmd'
import { ENTER, A, Q, COLON } from '../utils/constants'
import { checkForLocalBranch } from '../../src/helpers/git'
import { execPromisified } from '../../src/helpers/execPromisified'

beforeAll(async () => {
  await signin()
  await execPromisified('mkdir testrepo')
  process.chdir('testrepo')
})

afterAll(async () => {
  await cleanup('issue:start')
  process.chdir('../')
  await execPromisified('rm -rf testrepo')
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
