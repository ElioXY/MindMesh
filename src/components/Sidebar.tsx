import { memo, useDeferredValue, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  FilePlus2, FolderPlus, Search, Tag, FileText, CalendarDays, Download, Upload, X,
  Folder, FolderOpen, ChevronRight, Pin, Pencil, Trash2,
} from 'lucide-react'
import { useStore } from '../store'
import { download, snippet, tagsOf, timeAgo } from '../lib/text'
import { allFolderPaths, buildTree, cleanPath, inFolder, parentOf, replacePrefix, type FolderNode } from '../lib/folders'
import type { Note } from '../types'

const MIME = 'application/x-mindmesh-note'
const isNoteDrag = (e: DragEvent) => e.dataTransfer.types.includes(MIME)

type Ctx = {
  byFolder: Map<string, Note[]>
  counts: Map<string, number>
  expanded: Set<string>
  toggle: (path: string) => void
  activeId: string | null
  open: (id: string) => void
  pin: (id: string) => void
  dropTarget: string | null
  setDropTarget: (p: string | null) => void
  dropTo: (folder: string, e: DragEvent) => void
  setDragging: (v: boolean) => void
  renaming: string | null
  setRenaming: (p: string | null) => void
  commitRename: (path: string, name: string) => void
  creatingIn: string | null
  setCreatingIn: (p: string | null) => void
  commitCreate: (parent: string, name: string) => void
  newNoteIn: (folder: string) => void
  removeFolder: (path: string) => void
  boot: boolean
}

const NoteItem = memo(function NoteItem(p: {
  note: Note; active: boolean; query: string; index: number; boot: boolean; depth: number; flat: boolean
  onOpen: (id: string) => void; onPin: (id: string) => void
  setDragging: (v: boolean) => void; setDropTarget: (f: string | null) => void
  dropTo: (folder: string, e: DragEvent) => void
}) {
  const n = p.note
  const sub = p.query
    ? snippet(n.content, p.query)
    : p.flat && n.folder ? `${n.folder}, ${timeAgo(n.updatedAt)}` : timeAgo(n.updatedAt)
  return (
    <div
      className={`note-row ${p.active ? 'active' : ''}`}
      style={{ paddingLeft: 6 + p.depth * 14, ...(p.boot ? { animationDelay: `${Math.min(p.index, 10) * 30}ms` } : {}) }}
      data-boot={p.boot || undefined}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData(MIME, n.id); e.dataTransfer.effectAllowed = 'move'; p.setDragging(true) }}
      onDragEnd={() => { p.setDragging(false); p.setDropTarget(null) }}
      onDragOver={(e) => { if (!isNoteDrag(e)) return; e.preventDefault(); e.stopPropagation(); p.setDropTarget(n.folder ?? '') }}
      onDrop={(e) => { if (isNoteDrag(e)) { e.preventDefault(); e.stopPropagation(); p.dropTo(n.folder ?? '', e) } }}
    >
      <button className="note-item" onClick={() => p.onOpen(n.id)}>
        <span className="note-title">{n.title}</span>
        <span className="note-sub">{sub}</span>
      </button>
      <button
        className={`pin-btn ${n.pinned ? 'on' : ''}`}
        title={n.pinned ? 'Unpin' : 'Pin to top'}
        aria-label={n.pinned ? `Unpin ${n.title}` : `Pin ${n.title}`}
        aria-pressed={!!n.pinned}
        onClick={() => p.onPin(n.id)}
      ><Pin size={13} /></button>
    </div>
  )
})

function FolderInput(p: { depth: number; initial?: string; placeholder: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const done = useRef(false)
  const finish = (value: string, commit: boolean) => {
    if (done.current) return
    done.current = true
    if (commit && value.trim()) p.onCommit(value.trim()); else p.onCancel()
  }
  return (
    <div className="folder-input" style={{ paddingLeft: 8 + p.depth * 14 }}>
      <Folder size={14} />
      <input
        autoFocus
        defaultValue={p.initial}
        placeholder={p.placeholder}
        aria-label={p.placeholder}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(e.currentTarget.value, true)
          else if (e.key === 'Escape') finish('', false)
        }}
        onBlur={(e) => finish(e.currentTarget.value, true)}
      />
    </div>
  )
}

function FolderBlock({ node, depth, c }: { node: FolderNode; depth: number; c: Ctx }) {
  const open = c.expanded.has(node.path)
  const notes = c.byFolder.get(node.path) ?? []
  const creating = c.creatingIn === node.path
  const empty = notes.length === 0 && node.children.length === 0 && !creating
  return (
    <div className={`folder ${open ? 'open' : ''}`}>
      {c.renaming === node.path ? (
        <FolderInput
          depth={depth} initial={node.name} placeholder="Folder name"
          onCommit={(v) => c.commitRename(node.path, v)} onCancel={() => c.setRenaming(null)}
        />
      ) : (
        <div
          className={`folder-row ${c.dropTarget === node.path ? 'drop' : ''}`}
          style={{ paddingLeft: 6 + depth * 14 }}
          onDragOver={(e) => { if (!isNoteDrag(e)) return; e.preventDefault(); e.stopPropagation(); c.setDropTarget(node.path) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) c.setDropTarget(null) }}
          onDrop={(e) => { if (isNoteDrag(e)) { e.preventDefault(); e.stopPropagation(); c.dropTo(node.path, e) } }}
        >
          <button className="folder-toggle" onClick={() => c.toggle(node.path)} aria-expanded={open}>
            <ChevronRight size={13} className="fchev" />
            {open ? <FolderOpen size={15} /> : <Folder size={15} />}
            <span className="folder-name">{node.name}</span>
            <span className="folder-count">{c.counts.get(node.path) ?? 0}</span>
          </button>
          <span className="folder-actions">
            <button title="New note here" aria-label={`New note in ${node.name}`} onClick={() => c.newNoteIn(node.path)}><FilePlus2 size={13} /></button>
            <button title="New subfolder" aria-label={`New subfolder in ${node.name}`} onClick={() => c.setCreatingIn(node.path)}><FolderPlus size={13} /></button>
            <button title="Rename folder" aria-label={`Rename ${node.name}`} onClick={() => c.setRenaming(node.path)}><Pencil size={13} /></button>
            <button title="Delete folder" aria-label={`Delete ${node.name}`} onClick={() => c.removeFolder(node.path)}><Trash2 size={13} /></button>
          </span>
        </div>
      )}
      <div className="folder-children">
        <div className="folder-clip" inert={!open}>
          {creating && (
            <FolderInput
              depth={depth + 1} placeholder="Folder name"
              onCommit={(v) => c.commitCreate(node.path, v)} onCancel={() => c.setCreatingIn(null)}
            />
          )}
          {node.children.map((ch) => <FolderBlock key={ch.path} node={ch} depth={depth + 1} c={c} />)}
          {notes.map((n, i) => (
            <NoteItem
              key={n.id} note={n} active={n.id === c.activeId} query="" index={i} boot={false} depth={depth + 1} flat={false}
              onOpen={c.open} onPin={c.pin} setDragging={c.setDragging} setDropTarget={c.setDropTarget} dropTo={c.dropTo}
            />
          ))}
          {empty && <p className="folder-empty" style={{ paddingLeft: 30 + depth * 14 }}>Empty. Drop notes here.</p>}
        </div>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const liveNotes = useStore((s) => s.notes)
  const notes = useDeferredValue(liveNotes)
  const explicitFolders = useStore((s) => s.folders)
  const activeId = useStore((s) => s.activeId)
  const st = useStore.getState()

  const [rawQuery, setRawQuery] = useState('')
  const query = useDeferredValue(rawQuery.trim())
  const [tab, setTab] = useState<'notes' | 'tags'>('notes')
  const [tag, setTag] = useState<string | null>(null)
  const [boot, setBoot] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [creatingIn, setCreatingIn] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('mindmesh:open') ?? '[]') as string[]) } catch { return new Set() }
  })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { const t = setTimeout(() => setBoot(false), 900); return () => clearTimeout(t) }, [])
  useEffect(() => { localStorage.setItem('mindmesh:open', JSON.stringify([...expanded])) }, [expanded])

  // reveal the active note's folder
  const activeFolder = notes.find((n) => n.id === activeId)?.folder
  useEffect(() => {
    if (!activeFolder) return
    setExpanded((prev) => {
      const next = new Set(prev)
      let cur = activeFolder
      while (cur) { next.add(cur); cur = parentOf(cur) }
      return next.size === prev.size ? prev : next
    })
  }, [activeFolder, activeId])

  const folderPaths = useMemo(() => allFolderPaths(notes, explicitFolders), [notes, explicitFolders])
  const tree = useMemo(() => buildTree(folderPaths), [folderPaths])

  const byFolder = useMemo(() => {
    const m = new Map<string, Note[]>()
    for (const n of notes) {
      const k = n.folder ?? ''
      const arr = m.get(k)
      if (arr) arr.push(n); else m.set(k, [n])
    }
    for (const arr of m.values()) arr.sort((a, b) => a.title.localeCompare(b.title))
    return m
  }, [notes])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of notes) {
      let cur = n.folder ?? ''
      while (cur) { m.set(cur, (m.get(cur) ?? 0) + 1); cur = parentOf(cur) }
    }
    return m
  }, [notes])

  const tags = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of notes) for (const t of tagsOf(n)) m.set(t, (m.get(t) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [notes])

  const pinned = useMemo(() => notes.filter((n) => n.pinned).sort((a, b) => a.title.localeCompare(b.title)), [notes])

  const flat = useMemo(() => {
    const q = query.toLowerCase()
    return notes
      .filter((n) => !tag || tagsOf(n).includes(tag))
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [notes, query, tag])

  const flatMode = !!query || !!tag

  const open = (id: string) => {
    useStore.getState().openNote(id)
    if (window.innerWidth <= 800) useStore.getState().toggleSidebar()
  }

  const expand = (path: string) => setExpanded((prev) => (prev.has(path) ? prev : new Set(prev).add(path)))

  const ctx: Ctx = {
    byFolder, counts, expanded, activeId, open, boot,
    toggle: (p) => setExpanded((prev) => { const n = new Set(prev); if (n.has(p)) n.delete(p); else n.add(p); return n }),
    pin: (id) => useStore.getState().togglePin(id),
    dropTarget, setDropTarget, setDragging,
    dropTo: (folder, e) => {
      const id = e.dataTransfer.getData(MIME)
      setDropTarget(null); setDragging(false)
      if (!id) return
      useStore.getState().moveNote(id, folder)
      if (folder) expand(folder)
      useStore.getState().toast(`Moved to ${folder || 'the vault root'}`)
    },
    renaming, setRenaming,
    commitRename: (path, name) => {
      const parent = parentOf(path)
      const np = cleanPath(parent ? `${parent}/${name}` : name)
      setRenaming(null)
      if (!np || np === path) return
      useStore.getState().renameFolder(path, np)
      setExpanded((prev) => new Set([...prev].map((p) => (inFolder(p, path) ? replacePrefix(p, path, np) : p))))
    },
    creatingIn, setCreatingIn,
    commitCreate: (parent, name) => {
      const p = cleanPath(parent ? `${parent}/${name}` : name)
      setCreatingIn(null)
      if (!p) return
      useStore.getState().createFolder(p)
      if (parent) expand(parent)
      expand(p)
    },
    newNoteIn: (folder) => { expand(folder); useStore.getState().createNote('Untitled', undefined, folder) },
    removeFolder: (path) => useStore.getState().deleteFolder(path),
  }

  async function onImport(files: FileList | null) {
    if (!files?.length) return
    const items: Array<Pick<Note, 'title' | 'content'> & Partial<Note>> = []
    const extra: string[] = []
    for (const f of Array.from(files)) {
      const text = await f.text()
      if (f.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text)
          const arr = Array.isArray(data) ? data : data.notes
          if (Array.isArray(data?.folders)) for (const p of data.folders) if (typeof p === 'string') extra.push(p)
          if (Array.isArray(arr)) for (const n of arr) if (typeof n?.title === 'string' && typeof n?.content === 'string') items.push(n)
        } catch { st.toast(`Couldn't read ${f.name}. Use a MindMesh backup or a Markdown file.`) }
      } else {
        items.push({ title: f.name.replace(/\.(md|markdown|txt)$/i, ''), content: text })
      }
    }
    const n = useStore.getState().importNotes(items, extra)
    if (n) useStore.getState().toast(`Imported ${n} note${n === 1 ? '' : 's'}`)
    if (fileRef.current) fileRef.current.value = ''
  }

  const itemProps = { onOpen: open, onPin: ctx.pin, setDragging, setDropTarget, dropTo: ctx.dropTo }

  return (
    <aside className="sidebar">
      <div className="side-actions">
        <button className="btn primary" onClick={() => useStore.getState().createNote()}>
          <FilePlus2 size={15} /> New note <kbd>Alt N</kbd>
        </button>
        <button
          className="icon-btn" title="New folder" aria-label="New folder"
          onClick={() => { setTab('notes'); setRawQuery(''); setTag(null); setCreatingIn('') }}
        ><FolderPlus size={16} /></button>
        <button className="icon-btn" title="Open today's note" aria-label="Open today's note" onClick={() => useStore.getState().dailyNote()}><CalendarDays size={16} /></button>
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

      {tab === 'notes' && flatMode && (
        <div className="note-list">
          {tag && <button className="chip on filter-chip" onClick={() => setTag(null)}>#{tag} <X size={11} /></button>}
          {flat.map((n, i) => (
            <NoteItem key={n.id} note={n} active={n.id === activeId} query={query} index={i} boot={boot} depth={0} flat {...itemProps} />
          ))}
          {flat.length === 0 && <p className="muted">{query ? `No notes match “${query}”.` : 'No notes with that tag.'}</p>}
        </div>
      )}

      {tab === 'notes' && !flatMode && (
        <div
          className={`note-list ${dragging && dropTarget === '' ? 'drop-root' : ''}`}
          onDragOver={(e) => { if (!isNoteDrag(e)) return; e.preventDefault(); setDropTarget('') }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null) }}
          onDrop={(e) => { if (isNoteDrag(e)) { e.preventDefault(); ctx.dropTo('', e) } }}
        >
          {pinned.length > 0 && (
            <>
              <div className="list-label"><Pin size={11} /> Pinned</div>
              {pinned.map((n) => (
                <NoteItem key={`pin-${n.id}`} note={n} active={n.id === activeId} query="" index={0} boot={false} depth={0} flat={false} {...itemProps} />
              ))}
              <div className="list-label">Vault</div>
            </>
          )}
          {creatingIn === '' && (
            <FolderInput depth={0} placeholder="Folder name" onCommit={(v) => ctx.commitCreate('', v)} onCancel={() => setCreatingIn(null)} />
          )}
          {tree.map((node) => <FolderBlock key={node.path} node={node} depth={0} c={ctx} />)}
          {(byFolder.get('') ?? []).map((n, i) => (
            <NoteItem key={n.id} note={n} active={n.id === activeId} query="" index={i} boot={boot} depth={0} flat={false} {...itemProps} />
          ))}
          {notes.length === 0 && <p className="muted">No notes yet. Create your first one.</p>}
        </div>
      )}

      <div className="side-footer">
        <span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
        <div>
          <button
            className="icon-btn" title="Back up vault (JSON)" aria-label="Back up vault"
            onClick={() => {
              download('mindmesh-vault.json', JSON.stringify({ app: 'mindmesh', notes: liveNotes, folders: allFolderPaths(liveNotes, explicitFolders) }, null, 2), 'application/json')
              useStore.getState().toast('Backup downloaded')
            }}
          ><Download size={15} /></button>
          <button className="icon-btn" title="Import .md or .json" aria-label="Import notes" onClick={() => fileRef.current?.click()}><Upload size={15} /></button>
          <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.json" multiple hidden onChange={(e) => void onImport(e.target.files)} />
        </div>
      </div>
    </aside>
  )
}

