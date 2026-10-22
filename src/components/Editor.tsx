import { useEffect, useRef } from 'react'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { useStore } from '../store'
import { norm } from '../store'
import { livePreview, refreshEffect } from '../lib/livePreview'
import { slashSource,  wikiSource } from '../lib/completions'

const External = Annotation.define<boolean>()

export default function Editor ({ id, content, live }: { id: string; content: string; live: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
}

type Suggest = { start: number; query: string; index: number }

export default function Editor({ id, content }: { id: string; content: string }) {
  const notes = useStore((s) => s.notes)
  const update = useStore((s) => s.updateContent)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [suggest, setSuggest] = useState<Suggest | null>(null)

  const matches = useMemo(() => {
    if (!suggest) return []
    const q = norm(suggest.query)
    return notes
      .filter((n) => n.id !== id && norm(n.title).includes(q))
      .sort((a, b) => Number(norm(b.title).startsWith(q)) - Number(norm(a.title).startsWith(q)))
      .slice(0, 6)
  }, [suggest, notes, id])

  useEffect(() => { setSuggest(null) }, [id])

  function detect(value: string, caret: number) {
    const before = value.slice(0, caret)
    const open = before.lastIndexOf('[[')
    if (open < 0) return setSuggest(null)
    const typed = before.slice(open + 2)
    if (/[\]\n]/.test(typed)) return setSuggest(null)
    setSuggest((s) => ({ start: open + 2, query: typed, index: s ? Math.min(s.index, 5) : 0 }))
  }

  function insert(title: string) {
    const el = ref.current
    if (!el || !suggest) return
    const caret = el.selectionStart
    const after = content.slice(caret)
    const closing = after.startsWith(']]') ? '' : ']]'
    const next = content.slice(0, suggest.start) + title + closing + after
    update(id, next)
    setSuggest(null)
    const pos = suggest.start + title.length + 2
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos) })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggest && matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggest({ ...suggest, index: (suggest.index + 1) % matches.length }) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSuggest({ ...suggest, index: (suggest.index - 1 + matches.length) % matches.length }) }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insert(matches[suggest.index].title) }
      else if (e.key === 'Escape') setSuggest(null)
      return
    }
    // Tab inserts two spaces; auto-continue lists on Enter
    const el = e.currentTarget
    if (e.key === 'Tab') {
      e.preventDefault()
      const s = el.selectionStart
      update(id, content.slice(0, s) + '  ' + content.slice(el.selectionEnd))
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
    } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const s = el.selectionStart
      const lineStart = content.lastIndexOf('\n', s - 1) + 1
      const line = content.slice(lineStart, s)
      const m = line.match(/^(\s*)([-*+]|\d+\.)( \[[ x]\])? (.*)$/)
      if (m) {
        e.preventDefault()
        if (!m[4]) {
          update(id, content.slice(0, lineStart) + content.slice(s))
          requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart))
        } else {
          const bullet = /\d/.test(m[2]) ? `${parseInt(m[2]) + 1}.` : m[2]
          const ins = `\n${m[1]}${bullet} ${m[3] ? '[ ] ' : ''}`
          update(id, content.slice(0, s) + ins + content.slice(el.selectionEnd))
          requestAnimationFrame(() => el.setSelectionRange(s + ins.length, s + ins.length))
        }
      }
    }
  }

  return (
    <div className="editor-wrap">
      <textarea
        ref={ref}
        className="editor"
        value={content}
        spellCheck
        placeholder="Start writing… use [[ to link notes and #tags to organize."
        onChange={(e) => { update(id, e.target.value); detect(e.target.value, e.target.selectionStart) }}
        onKeyDown={onKeyDown}
        onClick={(e) => detect(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setSuggest(null), 120)}
      />
      {suggest && (
        <div className="suggest">
          {matches.map((n, i) => (
            <button
              key={n.id}
              className={i === suggest.index ? 'active' : ''}
              onMouseDown={(e) => { e.preventDefault(); insert(n.title) }}
            >
              {n.title}
            </button>
          ))}
          {suggest.query.trim() && !notes.some((n) => norm(n.title) === norm(suggest.query)) && (
            <button
              className="suggest-new"
              onMouseDown={(e) => { e.preventDefault(); insert(suggest.query.trim()) }}
            >
              Link to new note “{suggest.query.trim()}”
            </button>
          )}
          {matches.length === 0 && !suggest.query.trim() && <div className="suggest-empty">Type a note title…</div>}
        </div>
      )}
    </div>
  )
}
