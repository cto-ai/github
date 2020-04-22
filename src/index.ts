const parse = require('parse-git-config')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const Debug = require('debug')
const yargs = require('yargs')

import { issueCreate } from './commands/issue:create'
import { issueDone } from './commands/issue:done'
import { issueList } from './commands/issue:list'
import { issueSave } from './commands/issue:save'
import { issueSearch } from './commands/issue:search'
import { issueStart } from './commands/issue:start'
import { labelAdd } from './commands/label:add'
import { labelEdit } from './commands/label:edit'
import { labelRemove } from './commands/label:remove'
import { labelSync } from './commands/label:sync'
import { pullsList } from './commands/pulls:list'
import { repoClone } from './commands/repo:clone'
import { repoCreate } from './commands/repo:create'
import { updateAccessToken } from './commands/token:update'
import { ParseAndHandleError } from './errors'
import { asyncPipe } from './helpers/asyncPipe'
import { getConfig, setConfig } from './helpers/config'
import { getGithub } from './helpers/getGithub'
import { logProvideCmdMsg } from './helpers/logProvideCmdMsg'

const debug = Debug('github')

type Pipeline = {
  args: string[]
  currentRepo: any
}

export const commands = {
  'repo:create': { functionName: repoCreate, description: 'Creates a repo' },
  'repo:clone': { functionName: repoClone, description: 'Clones a repo' },
  'issue:list': { functionName: issueList, description: 'Lists issues' },
  'issue:search': {
    functionName: issueSearch,
    description: 'Search issues [-q <+querystring> | --query <+querystring>]',
  },
  'issue:create': {
    functionName: issueCreate,
    description: 'Creates an issue',
  },
  'issue:start': { functionName: issueStart, description: 'Starts an issue' },
  'issue:save': {
    functionName: issueSave,
    description: 'Commits and push the code',
  },
  'issue:done': {
    functionName: issueDone,
    description: 'Creates a pull request once the issue is done',
  },
  'pulls:list': { functionName: pullsList, description: 'Lists pull-requests' },
  'label:add': { functionName: labelAdd, description: 'Adds labels to repo' },
  'label:edit': { functionName: labelEdit, description: 'Edits label' },
  'label:remove': { functionName: labelRemove, description: 'Removes label' },
  'label:sync': {
    functionName: labelSync,
    description: 'Sync up labels across repos',
  },
  'token:update': {
    functionName: updateAccessToken,
    description: 'Updates a github token',
    skipTokenAuthentication: true,
  },
}

const shouldSkipTokenAuthentication = (args: string[]): boolean =>
  !!args &&
  !!args[0] &&
  !!commands[args[0]] &&
  !!commands[args[0]].skipTokenAuthentication

const parseArguments = async (): Promise<Partial<Pipeline>> => {
  const args = yargs.argv

  if (!args._.length) {
    // log user friendly message when user does not provide a command
    await logProvideCmdMsg(commands)
    debug('no args passed')
    process.exit(1)
  }

  return { args: args._ }
}

const checkAccessToken = async ({
  args,
}: Partial<Pipeline>): Promise<Partial<Pipeline>> => {
  let accessToken = await getConfig('accessToken')
  if (!accessToken || accessToken === '') {
    await setConfig('accessToken', process.env.GITHUB_TEST_TOKEN)
    accessToken = process.env.GITHUB_TEST_TOKEN
  }
  const skipTokenAuthentication = shouldSkipTokenAuthentication(args)
  if (!skipTokenAuthentication && !accessToken) {
    await updateAccessToken()
  }
  return { args }
}

const manageGitConfig = async ({
  args,
}: Partial<Pipeline>): Promise<Partial<Pipeline>> => {
  const skipTokenAuthentication = shouldSkipTokenAuthentication(args)
  if (!skipTokenAuthentication) {
    try {
      const github = await getGithub()
      const {
        data: { name, email },
      } = await github.users.getAuthenticated()
      await setConfig('name', name)
      await setConfig('email', email)
    } catch (e) {
      await ParseAndHandleError(e, 'Authenticating user')
      debug('ERROR: getting authenticated user', e)
    }
  }
  const name = await getConfig('name')
  const email = await getConfig('email')

  try {
    await exec(`git config --global user.name "${name}"`)
    await exec(`git config --global user.email "${email}"`)
  } catch (err) {
    await ParseAndHandleError(err, 'Setting gitconfig username and email')
    debug('failed to set gitconfig', err)
  }

  return { args }
}

const getCurrentRepo = async ({
  args,
}: Partial<Pipeline>): Promise<Pipeline> => {
  const remoteRepos = (await getConfig('remoteRepos')) || []

  let currentRepo: string
  let gitConfig: JSON
  gitConfig = await parse()

  if (!gitConfig || !gitConfig['remote "origin"']) {
    return { args, currentRepo }
  }

  if (remoteRepos.length && gitConfig['remote "origin"']) {
    currentRepo = remoteRepos.find(remoteRepo => {
      return gitConfig['remote "origin"'].url.includes(remoteRepo.url)
    })
  }
  return { args, currentRepo }
}

const runCommand = async ({
  currentRepo,
  ...rest
}: Pipeline): Promise<Pipeline> => {
  try {
    const accessToken = await getConfig('accessToken')
    const remoteRepos = await getConfig('remoteRepos')

    await commands[process.argv[2].toLowerCase()].functionName({
      accessToken,
      currentRepo,
      remoteRepos,
    })
  } catch (err) {
    await ParseAndHandleError(err, process.argv[2])
  }

  return {
    currentRepo,
    ...rest,
  }
}

const main = async () => {
  const mainAsyncPipe = asyncPipe(
    parseArguments,
    checkAccessToken,
    manageGitConfig,
    getCurrentRepo,
    runCommand,
  )
  await mainAsyncPipe()
}

main()
