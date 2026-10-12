import Dexie, {type EntityTable} from "dexie"
import type { Note } from "./types"

export const db = new Dexie("mindmesh") as Dexie & {
    notes: EntityTable<Note, 'id'>
}

db.version(1).stores({notes: 'id, title, updatedAt'})