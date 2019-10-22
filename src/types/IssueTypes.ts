import { AutoCompleteQuestion } from '@cto.ai/inquirer'

export interface IssueListValue {
  title: string
  number: number
  repoOwner?: string
  repoName?: string
}

export interface IssueListPromptResponse {
  issue: IssueListValue
}

export interface IssueListFuzzy {
  name: string
  value: IssueListValue
}

export interface IssueStartValue {
  number: number
  title: string
}

export interface RepoContributor {
  name: string
}

export interface IssueSelection {
  name: string
  helpInfo: string
  value: IssueValue
}

export interface IssueValue {
  number: number
  title: string
}

export interface IssueSelectionItem {
  number: number
  title: string
  issue_path: string
  state: string
  comments: number
  body: string
  assignee: { login: string }
}

export interface HelpInfo {
  name: string
  helpInfo: string
}

export interface DataForFilter {
  name: string
  prompt: AutoCompleteQuestion<any>[]
}
