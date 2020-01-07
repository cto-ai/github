import { Question } from '@cto.ai/inquirer'
import { sdk, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import * as fs from 'fs-extra'
import * as path from 'path'
import simplegit from 'simple-git/promise'
import { LABELS } from '../constants'
import { ParseAndHandleError } from '../errors'
import { execPromisified } from '../helpers/execPromisified'
import { getGithub } from '../helpers/getGithub'
import { insertTokenInUrl } from '../helpers/insertTokenInUrl'
import { createLabels } from '../helpers/labels'
import { saveRemoteRepoToConfig } from '../helpers/saveRemoteRepoToConfig'
import { AnsRepoCreate } from '../types/Answers'
import { CommandOptions } from '../types/Config'

const debug = Debug('github:repoCreate')

/**
 * List orgs for the user
 *
 * @param {Github} github
 * @returns {Promise<Github.OrgsListForAuthenticatedUserResponseItem[]>}
 */
const listOrgs = async (
  github: Github,
): Promise<Github.OrgsListForAuthenticatedUserResponseItem[]> => {
  try {
    const { data: orgs } = await github.orgs.listForAuthenticatedUser()
    return orgs
  } catch (err) {
    debug('list orgs failed', err)
    await ParseAndHandleError(err, 'list Orgs')
  }
}

/**
 * Get authenticated user
 *
 * @param {Github} github
 * @returns
 */
const getUser = async (github: Github) => {
  try {
    const { data: personalAccount } = await github.users.getAuthenticated()
    return personalAccount
  } catch (err) {
    debug('get user failed', err)
    await ParseAndHandleError(err, 'Authenticate user')
  }
}
/**
 * prompt user to obtain repo name, description, privateOrPublic
 */
const getRepoInfoFromUser = async (
  orgs: Github.OrgsListForAuthenticatedUserResponseItem[],
  personalAccountLogin: string,
): Promise<AnsRepoCreate> => {
  const orgsList = [
    {
      name: `${personalAccountLogin} ${ux.colors.dim('[Personal Account]')}`,
      value: personalAccountLogin,
    },
    ...orgs.map(org => {
      return { name: org.login, value: org.login }
    }),
  ]
  const questions: Question<AnsRepoCreate>[] = [
    {
      type: 'list',
      name: 'org',
      message: `\nPlease select the organization of your repo →`,
      choices: orgsList,
      afterMessage: `${ux.colors.reset.green('✓')} Org`,
    },
    {
      type: 'input',
      name: 'name',
      message: `\nPlease enter the name of the repo →
      \n${ux.colors.white('📝 Enter Name')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Name`,
      validate: input => {
        if (input === '') {
          return 'The repo name cannot be blank!'
        } else {
          return true
        }
      },
    },
    {
      type: 'input',
      name: 'description',
      message: `\nPlease enter the description of the repo →
      \n${ux.colors.white('📝 Enter Description')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Description`,
    },
    {
      type: 'list',
      name: 'privateOrPublic',
      message: 'Do you want to create a public repo or a private repo?',
      choices: [
        { name: '🔐 private', value: 'private' },
        { name: '🌎 public', value: 'public' },
      ],
      afterMessage: `${ux.colors.reset.green('✓')} Type`,
    },
  ]
  const answers = await ux.prompt<AnsRepoCreate>(questions)
  return answers
}

/**
 * create repo in github
 *
 * @param name repo name
 * @param description repo description
 * @param privateOrPublic denotes whether repo to be created is to be public or private, value can either be 'private' or 'public'
 * @param github Github instance
 */
const createGithubRepo = async (
  { org, name, description, privateOrPublic }: AnsRepoCreate,
  personalAccountLogin: string,
  github: Github,
) => {
  const options = {
    name,
    description,
    private: privateOrPublic === 'private',
  }
  try {
    if (org === personalAccountLogin) {
      const response = await github.repos.createForAuthenticatedUser(options)
      return response
    }
    const response = await github.repos.createInOrg({ org, ...options })
    return response
  } catch (err) {
    ux.print(err)
    ux.spinner.stop('failed!')
    await ParseAndHandleError(err, 'createRepo()')
  }
}

/**
 *
 * repo:create command
 */
export const repoCreate = async ({ accessToken }: CommandOptions) => {
  try {
    const github = await getGithub()

    const orgs = await listOrgs(github)
    const { login: personalAccountLogin } = await getUser(github)

    const answers = await getRepoInfoFromUser(orgs, personalAccountLogin)

    await ux.spinner.start('Creating repo')

    const {
      data: { clone_url, name, owner },
    } = await createGithubRepo(answers, personalAccountLogin, github)

    // add labels to the repo
    await createLabels(owner.login, name, Object.values(LABELS), github)

    // clone repo
    const urlWithToken = insertTokenInUrl(clone_url, accessToken)
    try {
      await simplegit().clone(urlWithToken, name)
    } catch (e) {
      await ParseAndHandleError(e, 'repo clone')
    }

    // set config
    saveRemoteRepoToConfig(owner.login, name)

    await fs.ensureDir(`${name}`)
    // copies select template files
    const src = path.resolve(__dirname, '../templates')
    const dest = path.resolve(process.cwd(), `${name}/.github/ISSUE_TEMPLATE`)
    await fs.copy(src, dest)

    await execPromisified(
      `cd ${name} && git add . && git commit --allow-empty -m 'initial commit' && git push`,
    )

    ux.spinner.stop(`${ux.colors.green('done!')}`)

    sdk.log(
      `\n🎉 ${ux.colors.callOutCyan(
        `Successfully created repo ${ux.colors.white(
          name,
        )}. ${ux.colors.italic.dim(
          ux.colors.white(`'cd ${name}'`),
        )} to get started.`,
      )} \n`,
    )
  } catch (err) {
    ux.spinner.stop(`${ux.colors.red('failed!')}\n`)
    debug('repo:create failed', err)
    await ParseAndHandleError(err, 'repo:create')
  }
}
