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

type Snippet = { label: string; detail: string; text: () => string; cursor?: number }
const today = () => new Date().toISOString().slice(0, 10)

const SNIPPETS: Snippet[] = [
  { label: '/h1', detail: 'Heading 1', text: () => '# ' },
  { label: '/h2', detail: 'Heading 2', text: () => '## ' },
  { label: '/h3', detail: 'Heading 3', text: () => '### ' },
  { label: '/todo', detail: 'Task list', text: () => '- [ ] ' },
  { label: '/bullet', detail: 'Bulleted list', text: () => '- ' },
  { label: '/number', detail: 'Numbered list', text: () => '1. ' },
  { label: '/quote', detail: 'Quote', text: () => '> ' },
  { label: '/code', detail: 'Code block', text: () => '```\n\n```', cursor: 4 },
  { label: '/table', detail: 'Table', text: () => '| Column | Column |\n| ------ | ------ |\n|        |        |\n', cursor: 2 },
  { label: '/divider', detail: 'Divider', text: () => '---\n' },
  { label: '/date', detail: "Today's date", text: today },
  { label: '/link', detail: 'Link to a note', text: () => '[[]]', cursor: 2 },
]

export function slashSource(ctx: CompletionContext): CompletionResult | null {
  const m = ctx.matchBefore(/(?:^|\s)\/[\w-]*/)
  if (!m) return null
  const from = m.text.startsWith('/') ? m.from : m.from + 1
  return {
    from,
    validFor: /^\/[\w-]*$/,
    options: SNIPPETS.map((s) => ({
      label: s.label,
      detail: s.detail,
      type: 'keyword',
      apply: (view: EditorView, _c: Completion, a: number, b: number) => {
        const text = s.text()
        view.dispatch({ changes: { from: a, to: b, insert: text }, selection: { anchor: a + (s.cursor ?? text.length) } })
      },
    })),
  }
}
