export interface Workspace {
  id: string
  name: string
  remoteUrl?: string
  remoteUsername?: string
  remotePassword?: string
  remotePrefix?: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceFormData {
  name: string
  remoteUrl?: string
  remoteUsername?: string
  remotePassword?: string
  remotePrefix?: string
}

export type WorkspaceSyncState = 'disabled' | 'idle' | 'active' | 'paused' | 'error'

export interface WorkspaceSyncStatus {
  workspaceId: string
  state: WorkspaceSyncState
  lastError?: string
  lastChangeAt?: string
  pendingPush: number
  pendingPull: number
}

export function emptySyncStatus(workspaceId: string): WorkspaceSyncStatus {
  return {
    workspaceId,
    state: 'disabled',
    pendingPush: 0,
    pendingPull: 0
  }
}
