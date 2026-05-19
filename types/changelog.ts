export type ChangelogType = 'feature' | 'fix' | 'improvement' | 'breaking'

export interface Changelog {
  id: string
  version: string
  type: ChangelogType
  title: string
  description: string
  releaseDate: string
  createdAt: string
  updatedAt: string
}

export interface ChangelogCreateInput {
  version: string
  type: ChangelogType
  title: string
  description: string
  releaseDate: string
}

export type ChangelogUpdateInput = Partial<ChangelogCreateInput>

export interface ChangelogGroup {
  version: string
  releaseDate: string
  items: Changelog[]
}

export interface UserChangelogStatus {
  lastReadVersion: string
}
