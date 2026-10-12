export type Note = {
    id: string
    title: string
    content: string
    createdAt: number
    updatedAt: number
}

export type ViewMode = 'edit' | 'split' | 'preview' | 'graph'