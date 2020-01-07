import { getGithub } from '../../src/helpers/getGithub'
import { filterForRepoInfo } from '../../src/helpers/checkCurrentRepo'
import { execPromisified } from '../../src/helpers/execPromisified'
import { getConfig, setConfig } from '../../src/helpers/config'
import { sdk } from '@cto.ai/sdk'
import fs from 'fs'
import parse from 'parse-git-config'
import { TEAM_NAME_IDENTIFIER } from './constants'

const cleanRepoCreate = async () => {
  try {
    const gitconfig = await parse({ cwd: './a/', path: '.git/config' })
    const originUrl = gitconfig['remote "origin"'].url
    const github = await getGithub()
    if (!originUrl.includes('github')) {
      ux.print(
        `❗ This repo's remote "origin" is not currently set for a Github repo`,
      )
      process.exit()
    }
    const { owner, repo } = filterForRepoInfo(originUrl)
    await github.repos.delete({
      owner,
      repo,
    })
    await execPromisified('rm -rf ./a')
  } catch (err) {
    console.error({ err })
  }
}

const cleanRemoteRepoInConfig = async () => {
  try {
    const { stdout } = await execPromisified('ops whoami')
    const indexOfTeamName =
      stdout.indexOf(TEAM_NAME_IDENTIFIER) + TEAM_NAME_IDENTIFIER.length
    const teamName = stdout.substr(indexOfTeamName).trim()
    const rawConfigdata = fs.readFileSync(
      process.env.HOME + `/.config/@cto.ai/ops/${teamName}/github/config.json`,
    )
    const configData = JSON.parse(rawConfigdata.toString())
    delete configData.remoteRepos
    fs.writeFileSync(
      process.env.HOME + `/.config/@cto.ai/ops/${teamName}/github/config.json`,
      JSON.stringify(configData),
      'utf8',
    )
  } catch (err) {
    console.error({ err })
  }
}

const cleanRepoClone = async () => {
  try {
    await execPromisified('rm -rf ./testgh')
    await cleanRemoteRepoInConfig()
  } catch (err) {
    console.error({ err })
  }
}
const cleanIssueCreate = async () => {
  try {
    const gitconfig = await parse()
    const originUrl = gitconfig['remote "origin"'].url
    const github = await getGithub()
    if (!originUrl.includes('github')) {
      ux.print(
        `❗ This repo's remote "origin" is not currently set for a Github repo`,
      )
      process.exit()
    }
    const { owner, repo } = filterForRepoInfo(originUrl)
    await github.repos.delete({
      owner,
      repo,
    })
    process.chdir('../')
    await execPromisified('rm -rf testgh-issue')
  } catch (err) {
    console.error({ err })
  }
}

const cleanIssueStart = async () => {
  try {
    await cleanRepoClone()
    process.chdir('../')
    execPromisified('rm -rf testgh')
  } catch (err) {
    console.error({ err })
  }
}

export const cleanupFn = {
  'repo:create': cleanRepoCreate,
  'repo:clone': cleanRepoClone,
  'issue:create': cleanIssueCreate,
  'issue:start': cleanIssueStart,
  'config:remote': cleanRemoteRepoInConfig,
}
