import { run, cleanup } from '../utils/cmd'
import { GITHUB_TEST_TOKEN, GITHUB_TEST_REPO_URL } from '../utils/constants'
import { UP, DOWN, ENTER, SPACE, A, Q, COLON } from '../utils/constants'
import { getGithub } from '../../src/helpers/getGithub'
import { getConfig, setConfig } from '../../src/helpers/config'
import { execPromisified } from '../../src/helpers/execPromisified'
import parse from 'parse-git-config'
import { filterForRepoInfo } from '../../src/helpers/checkCurrentRepo'

beforeAll(async () => {
  await setConfig('accessToken', GITHUB_TEST_TOKEN)

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
    'should successfully clone repo from github',
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
        console.log(
          `❗ This repo's remote "origin" is not currently set for a Github repo`,
        )
        process.exit()
      }
      const { owner, repo } = filterForRepoInfo(originUrl)

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
