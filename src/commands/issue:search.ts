import { Question, sdk, ux } from '@cto.ai/sdk'
import * as Github from '@octokit/rest'
import Debug from 'debug'
import stripAnsi from 'strip-ansi'
import { LABELS } from '../constants'
import { ParseAndHandleError } from '../errors'
import { checkCurrentRepo } from '../helpers/checkCurrentRepo'
import { execPromisified } from '../helpers/execPromisified'
import { getGithub } from '../helpers/getGithub'
import { checkForLocalBranch, makeInitialCommit } from '../helpers/git'
import { AnsFilterSelect, AnsIssueSelect } from '../types/Answers'
import { CommandOptions } from '../types/Config'
import { DataForFilter, HelpInfo, IssueSelection, IssueSelectionItem } from '../types/IssueTypes'

const debug = Debug('github:issueSearch')
const yargs = require('yargs')

const filterSelectPrompt = (
  list: string[],
): Question<AnsFilterSelect>[] => [
  {
    type: 'autocomplete',
    name: 'filter',
    message: 'Please select the filter',
    autocomplete: list,
    pageSize: process.stdout.rows,
  },
]

const issueSelectPrompt = (
  list: IssueSelection[],
): Question<AnsIssueSelect>[] => [
  {
    type: 'autocomplete',
    name: 'issue',
    message: 'Please select the issue (use ➡️  key to view body)',
    autocomplete: list,
    pageSize: process.stdout.rows,
  },
]

const checkboxPrompt = (list): Question<AnsFilterSelect>[] => {
  return [
    {
      type: 'checkbox',
      name: 'issueFilter',
      message: 'Please select the filter',
      choices: list,
      // pageSize: process.stdout.rows,
    },
  ]
}

const promptForfilter = async (list: HelpInfo[]): Promise<string[]> => {
  const { issueFilter } = await ux.prompt(checkboxPrompt(list))
  return issueFilter
}

const getDataForFilter = async (
  github: Github,
  owner: string,
  repo: string,
  filter: string[],
): Promise<DataForFilter[]> => {
  const dataForfilter = await Promise.all(
    filter.map(async el => {
      switch (el) {
        case 'label':
          return github.issues
            .listLabelsForRepo({
              owner,
              repo,
            })
            .then(async res => {
              const { data } = res
              const labels = data.map(el => {
                return `${ux.colors.hex(el.color).bold(`${el.name}`)}`
              })
              return {
                name: el,
                prompt: labels && filterSelectPrompt(labels),
              }
            })
        case 'assignee':
          return github.issues
            .listAssignees({
              owner,
              repo,
            })
            .then(async res => {
              const { data } = res
              const assignees = data.map(el => {
                return el.login
              })

              return {
                name: el,
                prompt: assignees && filterSelectPrompt(assignees),
              }
            })
        case 'milestone':
          return github.issues
            .listMilestonesForRepo({
              owner,
              repo,
            })
            .then(async res => {
              const { data } = res
              const milestones = data.map(el => {
                return el.title
              })

              return {
                name: el,
                prompt: milestones && filterSelectPrompt(milestones),
              }
            })
        case 'state':
          return {
            name: el,
            prompt: filterSelectPrompt(['open', 'closed']),
          }
      }
    }),
  )
  return dataForfilter
}

const buildHelpInfo = (examples: string[]): string => {
  const { bold, italic } = ux.colors
  const spreadExamples = examples.join(', ')
  const helpInfo = bold.italic.grey('EXAMPLES: ') + italic.grey(spreadExamples)
  return helpInfo
}

export const issueSearch = async (cmdOptions: CommandOptions) => {
  try {
    await checkCurrentRepo(cmdOptions)
    const github: Github = await getGithub()
    // list issues specific to the repo
    const { owner, repo } = cmdOptions.currentRepo
    let q = `is:issue+repo:${owner}/${repo}`

    //checks for query flag: -q || --query
    const argv = yargs.alias('q', 'query').nargs('q', 1).argv
    if (!argv.q) {
      const checkBoxlist = [
        {
          name: 'state',
          helpInfo: buildHelpInfo(['open', 'closed']),
        },
        {
          name: 'label',
          helpInfo: buildHelpInfo(['bug', 'feature', 'docs']),
        },
        {
          name: 'milestone',
          helpInfo: buildHelpInfo(['1.0.0', '1.5.0']),
        },
        {
          name: 'assignee',
          helpInfo: buildHelpInfo(['octocat', 'gopher']),
        },
      ]
      const filter = await promptForfilter(checkBoxlist)
      const dataForfilter = await getDataForFilter(github, owner, repo, filter)

      const pickedFilter = []
      for (let i = 0; i < dataForfilter.length; i++) {
        const { filter } = await ux.prompt(dataForfilter[i].prompt)

        pickedFilter[i] = {}
        pickedFilter[i].name = dataForfilter[i].name
        pickedFilter[i].filter = stripAnsi(filter) // removes color ansi created by chalk api
        switch (pickedFilter[i].name) {
          case 'label':
            q = q.concat(`+label:${pickedFilter[i].filter}`)
            break
          case 'assignee':
            q = q.concat(`+assignee:${pickedFilter[i].filter}`)
            break
          case 'milestone':
            q = q.concat(`+milestone:${pickedFilter[i].filter}`)
            break
          case 'state':
            q = q.concat(`+is:${pickedFilter[i].filter}`)
            break
        }
      }
    } else {
      q = q.concat(argv.q.toString())
    }

    const { data } = await github.search.issuesAndPullRequests({ q })

    const filteredData = data.items.map(el => {
      return {
        number: el.number,
        title: el.title,
        body: el.body,
        issue_path: el.html_url.substr(
          el.html_url.indexOf('github.com/') + 'github.com/'.length,
        ),
        state: el.state,
        created_at: el.created_at,
        updated_at: el.updated_at,
        labels: el.labels,
        comments: el.comments,
        assignee: el.assignee,
      }
    })

    const issueSelectionList = filteredData.map((el: IssueSelectionItem) => {
      const { successGreen, errorRed, multiOrange, secondary } = ux.colors
      const { title, issue_path, state, comments, assignee, body, number } = el

      const strBuilder = () => {
        let stateStr
        if (state === 'open') {
          stateStr = successGreen(`state:${state}`)
        } else {
          stateStr = errorRed(`state:${state}`)
        }
        const commentStr = multiOrange(`comments:${comments}`)

        const assigneeStr = multiOrange(
          `assignee:${(assignee && assignee.login) || 'none'}`,
        )
        return `${title} (${issue_path})
${stateStr}\t ${commentStr}\t ${assigneeStr}\n`
      }

      return {
        name: strBuilder(),
        helpInfo: `\n${secondary(body)}\n`,
        value: {
          number,
          title,
        }, //value will be returned from prompt
      }
    })

    const { issue } = await ux.prompt(issueSelectPrompt(issueSelectionList))

    await ux.spinner.start('🚧 Setting up a branch...')
    const branchName = `${issue.number}-${issue.title.replace(/\s/g, '-')}`
    const hasLocalBranch = await checkForLocalBranch(branchName)

    if (!hasLocalBranch) {
      await execPromisified(`git checkout -b ${branchName}`)
      await makeInitialCommit()
    } else {
      await execPromisified(`git checkout ${branchName}`)
    }
    await ux.spinner.stop('complete!')
    try {
      await Promise.all([
        github.issues.removeLabel({
          owner,
          repo,
          issue_number: issue.number,
          name: LABELS.PM_TASKS.name,
        }),
        github.issues.addLabels({
          owner: owner,
          repo: repo,
          issue_number: issue.number,
          labels: [LABELS.PM_DOING.name],
        }),
      ])
    } catch (err) {
      await ParseAndHandleError(
        err,
        'Remove and Add Labels',
        LABELS.PM_TASKS.name,
      )
    }
    sdk.log(
      `\n🙌 Issue ${ux.colors.callOutCyan(
        `${issue.number}-${issue.title}`,
      )} has been checked out and ready to be worked on.\nUse ${ux.colors.callOutCyan(
        'ops run github issue:save',
      )} to commit & push.\n`,
    )
  } catch (err) {
    debug(err)
    await ParseAndHandleError(err, 'issue:search')
  }
}
