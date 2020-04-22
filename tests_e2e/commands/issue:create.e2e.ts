import { ux } from '@cto.ai/sdk'
import parse from 'parse-git-config'
import { filterForRepoInfo } from '../../src/helpers/checkCurrentRepo'
import { execPromisified } from '../../src/helpers/execPromisified'
import { getGithub } from '../../src/helpers/getGithub'
import { cleanup, run, signin } from '../utils/cmd'
import { A, COLON, ENTER, Q } from '../utils/constants'

beforeAll(async () => {
  await signin()
  const github = await getGithub()
  const name = 'testgh-issue'
  try {
    const { data } = await github.repos.createForAuthenticatedUser({
      name,
      has_issues: true,
    })
    await execPromisified(`git clone ${data.html_url}`)
    process.chdir('testgh-issue')
  } catch (err) {
    console.error(err)
  }
})

afterAll(async () => {
  await cleanup('issue:create')
})

describe('issue:create happy path', () => {
  test(
    'should create issue on Github',
    async () => {
      await run({
        args: ['issue:create'],
        inputs: [A, ENTER, ENTER, ENTER, COLON, Q, ENTER, ENTER],
        timeout: 10000,
      })

      const gitconfig = await parse()
      const originUrl = gitconfig['remote "origin"'].url
      const github = await getGithub()
      if (!originUrl.includes('github')) {
        await ux.print(
          `❗ This repo's remote "origin" is not currently set for a Github repo`,
        )
        process.exit()
      }
      const { owner, repo } = await filterForRepoInfo(originUrl)

      await github.repos
        .get({
          owner,
          repo,
        })
        .then(data => {
          const issueCount = data.data.open_issues_count
          expect(issueCount).toBeGreaterThan(0)
        })
    },
    1000 * 60 * 3,
  )
})
