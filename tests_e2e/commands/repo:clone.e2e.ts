import { run, cleanup, signin, signout } from '../utils/cmd'
import { ENTER } from '../utils/constants'
import { execPromisified } from '../../src/helpers/execPromisified'

beforeAll(async () => {
  await signin()
  await execPromisified('mkdir testrepo')
  process.chdir('testrepo')
})

afterAll(async () => {
  await cleanup('repo:clone')
  process.chdir('../')
  await execPromisified('rm -rf testrepo')
  await signout()
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
