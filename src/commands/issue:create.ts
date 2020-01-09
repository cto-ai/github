import { ux } from '@cto.ai/sdk'
import Debug from 'debug'
import * as fs from 'fs'
import * as path from 'path'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { getGithub } from '../helpers/getGithub'
import { hasIssueEnabled } from '../helpers/git'
import { AnsIssueDescription, AnsIssueTitleType } from '../types/Answers'
import { CommandOptions } from '../types/Config'

const debug = Debug('github:issueCreate')

export const issueCreate = async (cmdOptions: CommandOptions) => {
  try {
    await checkCurrentRepo(cmdOptions)
    const { repo, owner } = cmdOptions.currentRepo
    const github = await getGithub()
    // make sure to update repo to enable issues
    await ux.spinner.start(`🔍 Checking if Github repo has issues enabled`)
    const hasIssues = await hasIssueEnabled(owner, repo, github)
    if (!hasIssues) {
      try {
        await ux.spinner.stop('❌')
        await ux.print(`🏃 Trying to update repo to enable issues!`)
        await github.repos.update({
          name: repo,
          owner,
          repo,
          has_issues: true,
        })
      } catch (err) {
        await ParseAndHandleError(err, 'Update repo issue settings')
      }
    } else {
      await ux.spinner.stop('✅')
    }
    let templateDir = path.resolve(__dirname, `../templates/`)
    if (fs.existsSync(`.github/ISSUE_TEMPLATE`)) {
      templateDir = path.resolve(process.cwd(), `.github/ISSUE_TEMPLATE`)
    }
    const { title, type } = await ux.prompt<AnsIssueTitleType>([
      {
        type: 'input',
        name: 'title',
        message: `\n📝 Please enter your issue title:`,
        // afterMessage: `Title: `,
      },
      {
        type: 'list',
        name: 'type',
        message: `\n📝 Select your issue type: \n${ux.colors.reset(
          'Your default editor will be opened to allow editing of the issue details.',
        )}`,
        choices: fs.readdirSync(templateDir),
        // afterMessage: `Type: `,
      },
    ])

    let defaultDescription = fs.readFileSync(
      path.resolve(templateDir, type),
      'utf8',
    )

    const { description } = await ux.prompt<AnsIssueDescription>({
      type: 'editor',
      name: 'description',
      message: `\n`,
      default: defaultDescription,
    })

    const labels = description
      .match(/-{3}(\n.*)*-{3}/m)[0]
      .match(/labels:.*/g)[0]
      .split('labels: ')[1]
      .split(', ')
      .map(label => {
        return label.replace("'", '')
      })
    const body = description.replace(/-{3}(\n.*)*-{3}/m, '')
    const createResponse = await github.issues.create({
      owner,
      repo,
      title,
      labels,
      body,
    })

    await ux.print(
      `\n🎉 Successfully created issue ${ux.colors.callOutCyan(
        `${title}`,
      )} for the ${ux.colors.callOutCyan(
        `${cmdOptions.currentRepo.repo}`,
      )} repo: \n${ux.colors.callOutCyan(
        `${createResponse.data.html_url}\n`,
      )}\n👉 Use ${ux.colors.callOutCyan(
        'ops run github issue:start',
      )} to get started with the issue.\n`,
    )
  } catch (e) {
    debug('issue create failed', e)
    await ParseAndHandleError(e, 'issue:create')
  }
}
