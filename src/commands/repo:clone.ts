import { sdk, ux } from '@cto.ai/sdk'
import * as fuzzy from 'fuzzy'
import { Question } from '@cto.ai/inquirer'
import Debug from 'debug'
import { CommandOptions } from '../types/Config'
import { SelectedRepoClone, FormattedRepoClone } from '../types/RepoTypes'
import { Fuzzy } from '../types/Fuzzy'
import { getGithub } from '../helpers/getGithub'
import { saveRemoteRepoToConfig } from '../helpers/saveRemoteRepoToConfig'
import { cloneRepo } from '../helpers/git'
import { insertTokenInUrl } from '../helpers/insertTokenInUrl'
import { isRepoCloned } from '../helpers/isRepoCloned'
import { AnsRepoCloneSelect } from '../types/Answers'
import { getConfig } from '../helpers/config'
import { ParseAndHandleError } from '../errors'

const debug = Debug('github:repoClone')

/**
 * Formats the repo list to be displayed to the user
 *
 * @returns {Promise<FormattedRepoClone[]>}
 */
const formatList = async (): Promise<FormattedRepoClone[]> => {
  const remoteRepos = (await getConfig('remoteRepos')) || []
  const github = await getGithub()
  const { data: repos } = await github.repos.list({ per_page: 100 })

  const formattedRepos = repos.map(repo => {
    if (isRepoCloned(repo.owner.login, repo.name, remoteRepos))
      return {
        name: `🤖​ ${repo.full_name}`,
        value: {
          name: repo.name,
          url: repo.clone_url,
          owner: repo.owner.login,
        },
      }
    return {
      name: `${repo.full_name}`,
      value: {
        name: repo.name,
        url: repo.clone_url,
        owner: repo.owner.login,
      },
    }
  })

  return formattedRepos
}

/**
 * Does fuzzy search in the list for the matching characters
 *
 * @param {any} _
 * @param {string} [input='']
 * @returns
 */
const autocompleteSearch = async (_: any, input = '') => {
  const list = await formatList()
  const fuzzyResult: Fuzzy[] = await fuzzy.filter(input, list, {
    extract: el => el.name,
  })
  return fuzzyResult.map(result => result.original)
}

/**
 * Displays list of repo and returns the repo selected by the user
 *
 * @returns {Promise<SelectedRepoClone>} - selected repo
 */
const selectRepo = async (): Promise<SelectedRepoClone> => {
  const list: Question<AnsRepoCloneSelect> = {
    type: 'autocomplete',
    name: 'repo',
    pageSize: 7,
    message: 'Select a repo to clone. Repos with 🤖 are already cloned.\n',
    source: autocompleteSearch,
    bottomContent: '',
  }
  // assign type SelectedRepoClone to remoteRepo
  const { repo } = await ux.prompt<AnsRepoCloneSelect>(list)
  const { owner, name } = repo
  const remoteRepos = (await getConfig('remoteRepos')) || []

  if (isRepoCloned(owner, name, remoteRepos)) {
    sdk.log(`\n ❌ You have already cloned this repo!`)
    process.exit()
  }
  sdk.log(
    `\n 🎉 ${ux.colors.callOutCyan(
      `Successfully cloned repo! ${ux.colors.white(
        `'cd ${name}'`,
      )} to get started!`,
    )}\n`,
  )
  return repo
}

export const repoClone = async (options: CommandOptions) => {
  try {
    const { name, url, owner } = await selectRepo()
    const urlWithToken = await insertTokenInUrl(url, options.accessToken)
    await cloneRepo(urlWithToken)
    await saveRemoteRepoToConfig(owner, name)
    process.exit()
  } catch (err) {
    debug('repo:clone - error listing repo', err)
    await ParseAndHandleError(err, 'repo:clone')
  }
}
