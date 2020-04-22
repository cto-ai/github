import { Question, ux } from '@cto.ai/sdk'
import Debug from 'debug'
import { ParseAndHandleError } from '../errors'
import { getConfig } from '../helpers/config'
import { getGithub } from '../helpers/getGithub'
import { cloneRepo } from '../helpers/git'
import { insertTokenInUrl } from '../helpers/insertTokenInUrl'
import { isRepoCloned } from '../helpers/isRepoCloned'
import { keyValPrompt } from '../helpers/promptUtils'
import { saveRemoteRepoToConfig } from '../helpers/saveRemoteRepoToConfig'
import { AnsRepoCloneSelect } from '../types/Answers'
import { CommandOptions } from '../types/Config'
import { FormattedRepoClone, SelectedRepoClone } from '../types/RepoTypes'

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
 * Displays list of repo and returns the repo selected by the user
 *
 * @returns {Promise<SelectedRepoClone>} - selected repo
 */
const selectRepo = async (): Promise<SelectedRepoClone> => {
  const list: Question<AnsRepoCloneSelect> = {
    type: 'autocomplete',
    name: 'repo',
    message: 'Select a repo to clone. Repos with 🤖 are already cloned.\n',
    choices: [],
  }
  // assign type SelectedRepoClone to remoteRepo
  const { repo } = await keyValPrompt(list, await formatList())
  const { owner, name } = repo
  const remoteRepos = (await getConfig('remoteRepos')) || []

  if (isRepoCloned(owner, name, remoteRepos)) {
    await ux.print(`\n ❌ You have already cloned this repo!`)
    process.exit()
  }
  await ux.print(
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
