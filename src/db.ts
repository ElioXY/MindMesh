import Dexie, { type EntityTable } from 'dexie'
import type { Note } from './types'

export const db = new Dexie('mindmesh') as Dexie & {
  notes: EntityTable<Note, 'id'>
  folders: EntityTable<{ path: string }, 'path'>
}

db.version(1).stores({ notes: 'id, title, updatedAt' })
db.version(2).stores({ notes: 'id, title, updatedAt', folders: 'path' })
