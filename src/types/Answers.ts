import {
  IssueListValue,
  IssueStartValue,
  IssueValue,
  RepoContributor,
} from './IssueTypes'
import {
  LabelKeys,
  LabelRemoveFormattedItemValue,
  RepoWithOwnerAndName,
} from './Labels'
import { PullsListValue } from './PullsTypes'
import { SelectedRepoClone } from './RepoTypes'

export interface AnsIssueTitleType {
  title: string
  type: string
}

export interface AnsIssueDescription {
  description: string
}

export interface AnsSelectContributor {
  contributors: RepoContributor[]
}
export interface AnsIssueList {
  issue: IssueListValue
}
export interface AnsIssueSave {
  message: string
}
export interface AnsSelectIssueStart {
  issue: IssueStartValue
}
export interface AnsSelectLabelRemove {
  label: LabelRemoveFormattedItemValue
}

export interface AnsSelectLabelEdit {
  label: LabelKeys
}

export interface AnsSelectYesNo {
  yesOrNo: boolean
}

export interface AnsSelectReposForLabel {
  reposSelected: RepoWithOwnerAndName[]
}

export interface AnsSelectPull {
  pullRequest: PullsListValue
}

export interface AnsRepoCloneSelect {
  repo: SelectedRepoClone
}

export interface AnsRepoCreate {
  org: string
  name: string
  description: string
  privateOrPublic: string
}

export interface AnsToken {
  token: string
}

export interface AnsBaseRepo {
  baseRepo: string
}

export interface AnsSyncRepo {
  reposToSync: RepoWithOwnerAndName[]
}

export interface AnsPullRequest {
  title: string
  comment: string
}

export interface AnsFilterSelect {
  filter?: string
  issueFilter?: string[]
}

export interface AnsIssueSelect {
  issue: IssueValue
}
