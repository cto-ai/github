import { run, cleanup } from '../utils/cmd'
import {
  UP,
  DOWN,
  ENTER,
  SPACE,
  A,
  Q,
  N,
  COLON,
  TEAM_NAME_IDENTIFIER,
} from '../utils/constants'
import { getGithub } from '../../src/helpers/getGithub'
import { execPromisified } from '../../src/helpers/execPromisified'
import { sdk } from '@cto.ai/sdk'
import parse from 'parse-git-config'
import { filterForRepoInfo } from '../../src/helpers/checkCurrentRepo'
import fs from 'fs'

afterAll(async () => {
  await cleanup('config:remote')
  await cleanup('repo:create')
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
        console.log(
          `❗ This repo's remote "origin" is not currently set for a Github repo`,
        )
        process.exit()
      }
      const { owner, repo } = filterForRepoInfo(originUrl)

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
