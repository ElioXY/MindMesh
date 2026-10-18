import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { FilePlus2, Search, Tag, FileText, CalendarDays, Download, Upload, X } from 'lucide-react'
import { useStore } from '../store'
import { download, snippet, tagsOf, timeAgo } from '../lib/text'
import type { Note } from '../types'

const NoteItem = memo(function NoteItem(p: {
  note: Note; active: boolean; query: string; index: number; boot: boolean; onOpen: (id: string) => void
}) {
  const { note: n } = p
  return (
    <button
      className={`note-item ${p.active ? 'active' : ''}`}
      style={p.boot ? { animationDelay: `${Math.min(p.index, 10) * 30}ms` } : undefined}
      data-boot={p.boot || undefined}
      onClick={() => p.onOpen(n.id)}
    >
      <span className="note-title">{n.title}</span>
      <span className="note-sub">{p.query ? snippet(n.content, p.query) : timeAgo(n.updatedAt)}</span>
    </button>
  )
})

export default function Sidebar() {
  const liveNotes = useStore((s) => s.notes)
  const notes = useDeferredValue(liveNotes)
  const activeId = useStore((s) => s.activeId)
  const openNote = useStore((s) => s.openNote)
  const createNote = useStore((s) => s.createNote)
  const dailyNote = useStore((s) => s.dailyNote)
  const importNotes = useStore((s) => s.importNotes)
  const toast = useStore((s) => s.toast)
  const toggleSidebar = useStore((s) => s.toggleSidebar)

  const [rawQuery, setRawQuery] = useState('')
  const query = useDeferredValue(rawQuery.trim())
  const [tab, setTab] = useState<'notes' | 'tags'>('notes')
  const [tag, setTag] = useState<string | null>(null)
  const [boot, setBoot] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { const t = setTimeout(() => setBoot(false), 900); return () => clearTimeout(t) }, [])

  const tags = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of notes) for (const t of tagsOf(n)) m.set(t, (m.get(t) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [notes])

  const list = useMemo(() => {
    const q = query.toLowerCase()
    return notes
      .filter((n) => !tag || tagsOf(n).includes(tag))
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [notes, query, tag])

  const open = (id: string) => {
    openNote(id)
    if (window.innerWidth <= 800) toggleSidebar()
  }

  async function onImport(files: FileList | null) {
    if (!files?.length) return
    const items: Array<Pick<Note, 'title' | 'content'> & Partial<Note>> = []
    for (const f of Array.from(files)) {
      const text = await f.text()
      if (f.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text)
          const arr = Array.isArray(data) ? data : data.notes
          if (Array.isArray(arr)) for (const n of arr) if (typeof n?.title === 'string' && typeof n?.content === 'string') items.push(n)
        } catch { toast(`Couldn't read ${f.name}. Use a MindMesh backup or a Markdown file.`) }
      } else {
        items.push({ title: f.name.replace(/\.(md|markdown|txt)$/i, ''), content: text })
      }
    }
    const n = importNotes(items)
    if (n) toast(`Imported ${n} note${n === 1 ? '' : 's'}`)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <aside className="sidebar">
      <div className="side-actions">
        <button className="btn primary" onClick={() => createNote()}>
          <FilePlus2 size={15} /> New note <kbd>Alt N</kbd>
        </button>
        <button className="icon-btn" title="Open today's note" aria-label="Open today's note" onClick={dailyNote}><CalendarDays size={16} /></button>
      </div>

      <label className="search">
        <Search size={14} />
        <input placeholder="Search notes" aria-label="Search notes" value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} />
        {rawQuery && <button type="button" aria-label="Clear search" onClick={() => setRawQuery('')}><X size={13} /></button>}
      </label>

      <div className="tabs" data-tab={tab}>
        <span className="tabs-pill" />
        <button className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}><FileText size={13} /> Notes</button>
        <button className={tab === 'tags' ? 'on' : ''} onClick={() => setTab('tags')}><Tag size={13} /> Tags</button>
      </div>

      {tab === 'tags' && (
        <div className="tag-cloud">
          {tags.length === 0 && <p className="muted">No tags yet. Type #idea in any note to create one.</p>}
          {tags.map(([t, c]) => (
            <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => { setTag(tag === t ? null : t); setTab('notes') }}>
              #{t} <span>{c}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className="note-list">
          {tag && <button className="chip on filter-chip" onClick={() => setTag(null)}>#{tag} <X size={11} /></button>}
          {list.map((n, i) => (
            <NoteItem key={n.id} note={n} active={n.id === activeId} query={query} index={i} boot={boot} onOpen={open} />
          ))}
          {list.length === 0 && <p className="muted">{query ? `No notes match “${query}”.` : 'No notes yet. Create your first one.'}</p>}
        </div>
      )}

      <div className="side-footer">
        <span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
        <div>
          <button
            className="icon-btn" title="Back up vault (JSON)" aria-label="Back up vault"
            onClick={() => { download('mindmesh-vault.json', JSON.stringify({ app: 'mindmesh', notes: liveNotes }, null, 2), 'application/json'); toast('Backup downloaded') }}
          ><Download size={15} /></button>
          <button className="icon-btn" title="Import .md or .json" aria-label="Import notes" onClick={() => fileRef.current?.click()}><Upload size={15} /></button>
          <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.json" multiple hidden onChange={(e) => void onImport(e.target.files)} />
        </div>
      </div>
    </aside>
  )
}
