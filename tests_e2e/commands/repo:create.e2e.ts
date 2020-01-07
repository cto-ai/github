import { execPromisified } from '../../src/helpers/execPromisified'
import { cleanup, run, sleep } from '../utils/cmd'
import { A, ENTER } from '../utils/constants'

beforeAll(async () => {
  // await signin()
  sleep(3000)
  await execPromisified('mkdir testrepo && cd testrepo && git init')
  process.chdir('testrepo')
})

afterAll(async () => {
  await cleanup('repo:create')
  process.chdir('../')
  await execPromisified('rm -rf testrepo')
  // await signout()
})

describe('repo:create happy path', () => {
  test(
    'should successfully create repo in github',
    async () => {
      const result = await run({
        args: ['repo:create'],
        inputs: [ENTER, A, ENTER, A, ENTER, ENTER, ENTER],
        timeout: 12000,
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
