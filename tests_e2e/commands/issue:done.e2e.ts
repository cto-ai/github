import { ux } from '@cto.ai/sdk'
import parse from 'parse-git-config'
import { filterForRepoInfo } from '../../src/helpers/checkCurrentRepo'
import { execPromisified } from '../../src/helpers/execPromisified'
import { getGithub } from '../../src/helpers/getGithub'
import { cleanup, run, signin } from '../utils/cmd'
import { A, COLON, ENTER, N, Q } from '../utils/constants'

beforeAll(async () => {
  await signin()
  await execPromisified('mkdir testrepo && cd testrepo && git init')
  process.chdir('testrepo')
})
afterAll(async () => {
  await cleanup('config:remote')
  await cleanup('repo:create')
  process.chdir('../')
  await execPromisified('rm -rf testrepo')
})

describe('issue:done happy path', () => {
  test(
    'should create pull request',
    async () => {
      await run({
        args: ['repo:create'],
        inputs: [ENTER, A, ENTER, A, ENTER, ENTER, ENTER],
        timeout: 8000,
      })

      const gitconfig = await parse({ cwd: './a/', path: '.git/config' })
      const originUrl = gitconfig['remote "origin"'].url
      const github = await getGithub()
      if (!originUrl.includes('github')) {
        await ux.print(
          `❗ This repo's remote "origin" is not currently set for a Github repo`,
        )
        process.exit()
      }
      const { owner, repo } = await filterForRepoInfo(originUrl)

      process.chdir('a')

      await run({
        args: ['issue:create'],
        inputs: [A, ENTER, ENTER, ENTER, COLON, Q, ENTER, ENTER],
        timeout: 8000,
      })

      await run({
        args: ['issue:start'],
        inputs: [ENTER],
        timeout: 1500,
      })

      execPromisified('touch helloworld')

      await run({
        args: ['issue:save'],
        inputs: [A, ENTER],
        timeout: 1500,
      })

      await run({
        args: ['issue:done'],
        inputs: [A, ENTER, A, ENTER, N, ENTER],
        timeout: 5000,
      })

      process.chdir('../')

      const pulls = await github.pulls.list({
        owner,
        repo,
      })
      expect(pulls.data.length).toBeGreaterThan(0)
    },
    1000 * 180 * 3,
  )
})
