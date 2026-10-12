export type Note = {
    id: string
    title: string
    content: string
    createdAt: number
    updatedAt: number
}

export type ViewNode = 'edit' | 'split' | 'preview' | 'graph'