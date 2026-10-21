export type Note = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  folder?: string
  pinned?: boolean
}

export type ViewMode = 'live' | 'source' | 'split' | 'preview' | 'graph'
