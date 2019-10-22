export interface LabelRemoveFormattedItemValue {
  labelName: string
}

export interface LabelRemoveFormattedItem {
  name: string
  value: LabelRemoveFormattedItemValue
}

export interface LabelKeys {
  name: string
  description: string
  color: string
}

export interface LabelEditFormattedItem {
  name: string
  value: LabelKeys
}

export interface RepoWithOwnerAndName {
  owner: string
  repo: string
}

export interface RepoWithLabelsToAdd {
  repo: RepoWithOwnerAndName
  labels: LabelKeys[]
}
