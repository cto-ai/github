export interface SelectedRepoClone {
  name: string
  url: string
  owner: string
}

export interface FormattedRepoClone {
  name: string
  value: SelectedRepoClone
}

export interface RepoLabel {
  name: string
  color: string
  description?: string
}
