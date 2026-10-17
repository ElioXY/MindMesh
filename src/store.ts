import { create } from 'zustand'
import { db } from './db'
import type { Note, ViewMode } from './types'
import { norm, renameLinks, uniqueTitle } from './lib/text'

const timers = new Map<string, number>()
function persist(note: Note) {
  useStore.setState({ saving: true })
  window.clearTimeout(timers.get(note.id))
  timers.set(
    note.id,
    window.setTimeout(() => {
      timers.delete(note.id)
      void db.notes.put(note).then(() => {
        if (timers.size === 0) useStore.setState({ saving: false })
      })
    }, 350),
  )
}

type Theme = 'dark' | 'light'
export type Toast = { id: number; text: string; actionLabel?: string; action?: () => void; leaving?: boolean }
let toastId = 0

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t
  localStorage.setItem('mindmesh:theme', t)
}

const uid = () => crypto.randomUUID()

const WELCOME: Array<[string, string]> = [
  [
    'Welcome to MindMesh',
    `# Welcome to MindMesh

Your notes live **in this browser** (IndexedDB). Nothing is uploaded anywhere.

## Basics
- Link notes with double brackets: [[Linking notes]]
- Add tags anywhere, like #welcome or #ideas/projects
- Open the **Graph** view to see how your notes connect
- Press \`Ctrl/⌘ K\` for the command palette, \`Alt N\` for a new note, \`Ctrl/⌘ E\` to flip edit/preview

## Try it
- [ ] Create a note
- [ ] Link it from here
- [x] Install MindMesh

See also: [[Markdown cheatsheet]]
`,
  ],
  [
    'Linking notes',
    `# Linking notes

Type \`[[\` and start typing to pick a note. Clicking a link to a note that doesn't exist yet creates it.

Aliases work too: [[Welcome to MindMesh|go back home]].

Renaming a note updates every link that points to it. Check the **Backlinks** panel below the editor.

#welcome
`,
  ],
  [
    'Markdown cheatsheet',
    `# Markdown cheatsheet

**bold**, *italic*, ~~strike~~, \`inline code\`

> A quote

| Syntax | Result |
| ------ | ------ |
| \`**x**\` | bold |
| \`[[x]]\` | link |

\`\`\`js
console.log('code blocks work')
\`\`\`

Back to [[Welcome to MindMesh]].

#reference
`,
  ],
]

type State = {
  ready: boolean
  notes: Note[]
  activeId: string | null
  openIds: string[]
  view: ViewMode
  sidebarOpen: boolean
  paletteOpen: boolean
  theme: Theme
  saving: boolean
  toasts: Toast[]
  toggleTheme: () => void
  toast: (text: string, actionLabel?: string, action?: () => void) => void
  dismissToast: (id: number) => void
  restoreNote: (note: Note) => void
  load: () => Promise<void>
  createNote: (title?: string, content?: string) => string
  updateContent: (id: string, content: string) => void
  renameNote: (id: string, title: string) => void
  deleteNote: (id: string) => void
  openNote: (id: string) => void
  openByTitle: (title: string) => void
  closeTab: (id: string) => void
  setView: (v: ViewMode) => void
  toggleSidebar: () => void
  setPalette: (open: boolean) => void
  importNotes: (items: Array<Pick<Note, 'title' | 'content'> & Partial<Note>>) => number
  dailyNote: () => void
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  notes: [],
  activeId: null,
  openIds: [],
  view: 'split',
  sidebarOpen: window.innerWidth > 800,
  paletteOpen: false,
  theme: (localStorage.getItem('mindmesh:theme') as Theme | null)
    ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  saving: false,
  toasts: [],

  toggleTheme() {
    const t: Theme = get().theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    root.classList.add('theme-anim')
    applyTheme(t)
    set({ theme: t })
    window.setTimeout(() => root.classList.remove('theme-anim'), 350)
  },

  toast(text, actionLabel, action) {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, actionLabel, action }] }))
    window.setTimeout(() => get().dismissToast(id), actionLabel ? 6000 : 3000)
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }))
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 220)
  },

  restoreNote(note) {
    void db.notes.put(note)
    set((s) => ({ notes: [note, ...s.notes.filter((n) => n.id !== note.id)] }))
    get().openNote(note.id)
  },

  async load() {
    let notes = await db.notes.toArray()
    if (notes.length === 0) {
      const now = Date.now()
      notes = WELCOME.map(([title, content], i) => ({
       2 id: uid(), title, content, createdAt: now + i, updatedAt: now - i,
      }))
      await db.notes.bulkPut(notes)
    }
    const lastId = localStorage.getItem('mindmesh:last')
    const first = notes.find((n) => n.id === lastId) ?? notes.find((n) => n.title === 'Welcome to MindMesh') ?? notes[0]
    set({ notes, ready: true, activeId: first.id, openIds: [first.id] })
  },

  createNote(title = 'Un(titled', content) {
    const { notes } = get()
    const finalTitle = uniqueTitle(title, notes)
    const now = Date.now()
    const note: Note = {
      id : uid(), title: finalTitle,
      content: content ?? `# ${finalTitle}\n\n`,
      createdAt: now, updatedAt: now,
    }
    void db.notes.put(note)
    set((s) => ({
      notes: [note, ...s.notes],
      activeId: note.id,
      openIds: [...s.openIds, note.id],
      view. s.view === 'graph' ? 'split' : s.view,
    }))
    return note.id
  },

  updateContent(id, content) {
    let updated: Note | undefined
    set((s) => ({
      notes: s.notes.map
    }))
  },