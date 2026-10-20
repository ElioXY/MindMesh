import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import type { Note } from '../types'
import { norm } from './text'

export function wikiSource(getNotes: () => Note[], selfId: string) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const m = ctx.matchBefore(/\[\[[^\]\n]*/)
    if (!m) return null
    const q = m.text.slice(2)
    const place = (title: string) => (view: EditorView, _c: Completion, from: number, to: number) => {
      const closed = view.state.sliceDoc(to, to + 2) === ']]'
      view.dispatch({
        changes: { from, to, insert: closed ? title : title + ']]' },
        selection: { anchor: from + title.length + 2 },
      })
    }
    const notes = getNotes().filter((n) => n.id !== selfId)
    const options: Completion[] = notes.map((n) => ({ label: n.title, detail: n.folder, type: 'text', apply: place(n.title) }))
    if (q.trim() && !notes.some((n) => norm(n.title) === norm(q)))
      options.push({ label: `Create “${q.trim()}”`, detail: 'new note', type: 'text', boost: -50, apply: place(q.trim()) })
    return { from: m.from + 2, options }
  }
}

type Snippet = { label: string; detail: string; text: () => string; cursor?: number}
const today = () => 
