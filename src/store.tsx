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
