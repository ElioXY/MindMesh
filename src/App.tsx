import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  PanelLeft, X, Command, Pencil, Code, Columns2, Eye, Network, Trash2, Link2, Hash, Download, Sun, Moon, ChevronUp,
  Pin, PinOff, Share2,
} from 'lucide-react'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import LocalGraph from './components/LocalGraph'
import Palette from './components/Palette'
import Toasts from './components/Toasts'
import { download, linksOf, norm, tagsOf } from './lib/text'
import type { ViewMode } from './types'

const Graph = lazy(() => import('./components/Graph'))
const Editor = lazy(() => import('./components/Editor'))
const Preview = lazy(() => import('./components/Preview'))

const VIEWS: Array<[ViewMode, string, typeof Pencil]> = [
  ['live', 'Live', Pencil],
  ['source', 'Source', Code],
  ['split', 'Split', Columns2],
  ['preview', 'Preview', Eye],
  ['graph', 'Graph', Network],
]

export default function App() {
  const notes = useStore((s) => s.notes)
  const activeId = useStore((s) => s.activeId)
  const openIds = useStore((s) => s.openIds)
  const view = useStore((s) => s.view)
  const ready = useStore((s) => s.ready)
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const theme = useStore((s) => s.theme)
  const saving = useStore((s) => s.saving)
  const lgOpen = useStore((s) => s.localGraphOpen)
  const s = useStore.getState()
  const [metaOpen, setMetaOpen] = useState(true)

  useEffect(() => { void useStore.getState().load() }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (mod && k === 'k') { e.preventDefault(); st.setPalette(!st.paletteOpen) }
      else if (mod && k === 'e') { e.preventDefault(); st.setView(st.view === 'live' ? 'source' : 'live') }
      else if (e.altKey && k === 'n') { e.preventDefault(); st.createNote() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = notes.find((n) => n.id === activeId) ?? null
  const deferredContent = useDeferredValue(active?.content ?? '')
  const tabs = openIds.map((id) => notes.find((n) => n.id === id)).filter((n) => !!n)

  const backlinks = useMemo(() => {
    if (!active) return []
    const t = norm(active.title)
    return notes.filter((n) => n.id !== active.id && linksOf(n).includes(t))
  }, [notes, active])

  const outgoing = useMemo(() => {
    if (!active) return []
    return linksOf(active).map((t) => ({
      title: notes.find((n) => norm(n.title) === t)?.title ?? t,
      exists: notes.some((n) => norm(n.title) === t),
    }))
  }, [notes, active])

  const tags = active ? tagsOf(active) : []
  const words = active ? (active.content.trim().match(/\S+/g)?.length ?? 0) : 0
  const viewIndex = Math.max(0, VIEWS.findIndex(([v]) => v === view))

  if (!ready) {
    return (
      <div className="loading"><div className="loading-mark" /><span>Opening your vault</span></div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-btn" title="Toggle sidebar" aria-label="Toggle sidebar" aria-pressed={sidebarOpen} onClick={s.toggleSidebar}>
          <PanelLeft size={17} />
        </button>
        <div className="brand">mindmesh<span>.</span></div>

        <div className="tabs-bar">
          {tabs.map((n) => (
            <div key={n.id} className={`doc-tab ${n.id === activeId && view !== 'graph' ? 'active' : ''}`} onClick={() => s.openNote(n.id)}>
              <span>{n.title}</span>
              <button title="Close tab" aria-label={`Close ${n.title}`} onClick={(e) => { e.stopPropagation(); s.closeTab(n.id) }}><X size={12} /></button>
            </div>
          ))}
        </div>

        <div className="view-switch" style={{ ['--i' as string]: viewIndex }}>
          <span className="seg-indicator" />
          {VIEWS.map(([v, label, Icon]) => (
            <button key={v} className={view === v ? 'on' : ''} title={label} aria-label={label} onClick={() => s.setView(v)}>
              <Icon size={15} /><span>{label}</span>
            </button>
          ))}
        </div>
        <button className="icon-btn theme-btn" title="Toggle theme" aria-label="Toggle theme" onClick={s.toggleTheme}>
          <span key={theme} className="spin-in">{theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}</span>
        </button>
        <button className="icon-btn" title="Command palette (Ctrl/⌘ K)" aria-label="Command palette" onClick={() => s.setPalette(true)}><Command size={16} /></button>
      </header>

      <div className="body">
        <div className={`sidebar-shell ${sidebarOpen ? 'open' : ''}`} aria-hidden={!sidebarOpen}>
          <Sidebar />
        </div>
        {sidebarOpen && <div className="scrim" onClick={s.toggleSidebar} />}

        <main className="main">
          {view === 'graph' ? (
            <Suspense fallback={<div className="loading"><div className="loading-mark" /><span>Drawing your graph</span></div>}>
              <div className="graph-wrap"><Graph /></div>
            </Suspense>
          ) : active ? (
            <div className="note-shell">
              <div className="note-col">
                <div key={active.id} className={`note-view ${view === 'split' ? '' : 'solo'}`}>
                  <div className="note-head">
                    <div className="title-col">
                      {active.folder && <div className="crumb">{active.folder.split('/').join(' / ')}</div>}
                      <input
                        className="title-input"
                        aria-label="Note title"
                        defaultValue={active.title}
                        onBlur={(e) => {
                          s.renameNote(active.id, e.target.value)
                          e.target.value = useStore.getState().notes.find((n) => n.id === active.id)?.title ?? active.title
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      />
                    </div>
                    <div className="note-actions">
                      <button className={`icon-btn ${active.pinned ? 'on' : ''}`} title={active.pinned ? 'Unpin note' : 'Pin note'} aria-label={active.pinned ? 'Unpin note' : 'Pin note'} aria-pressed={!!active.pinned} onClick={() => s.togglePin(active.id)}>
                        {active.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                      </button>
                      <button className={`icon-btn lg-toggle ${lgOpen ? 'on' : ''}`} title="Local graph" aria-label="Toggle local graph" aria-pressed={lgOpen} onClick={() => s.setLocalGraph(!lgOpen)}><Share2 size={15} /></button>
                      <button className="icon-btn" title="Export as .md" aria-label="Export as Markdown" onClick={() => { download(`${active.title}.md`, active.content, 'text/markdown'); s.toast('Exported as Markdown') }}><Download size={15} /></button>
                      <button className="icon-btn danger" title="Delete note" aria-label="Delete note" onClick={() => s.deleteNote(active.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <div className={`panes ${view}`}>
                    <Suspense fallback={<div className="pane-wait" />}>
                      {view !== 'preview' && <Editor id={active.id} content={active.content} live={view === 'live'} />}
                    {(view === 'split' || view === 'preview') && <div className="preview-scroll pane-in"><Preview content={deferredContent} /></div>}
                    </Suspense>
                  </div>
                </div>

                <div className={`meta-wrap ${metaOpen ? '' : 'closed'}`}>
                  <div className="meta-clip">
                    <div className="meta">
                      <div className="meta-col">
                        <h4><Link2 size={13} /> Backlinks <span>{backlinks.length}</span></h4>
                        {backlinks.length === 0 && <p className="muted">No notes link here yet.</p>}
                        {backlinks.map((n) => <button key={n.id} className="link-row" onClick={() => s.openNote(n.id)}>{n.title}</button>)}
                      </div>
                      <div className="meta-col">
                        <h4><Link2 size={13} /> Links out <span>{outgoing.length}</span></h4>
                        {outgoing.length === 0 && <p className="muted">Type [[ to link another note.</p>}
                        {outgoing.map((o) => (
                          <button key={o.title} className={`link-row ${o.exists ? '' : 'missing'}`} onClick={() => s.openByTitle(o.title)}>
                            {o.title}{!o.exists && ' (create)'}
                          </button>
                        ))}
                      </div>
                      <div className="meta-col">
                        <h4><Hash size={13} /> Tags <span>{tags.length}</span></h4>
                        <div className="tag-cloud">
                          {tags.length === 0 && <p className="muted">Type #idea to add a tag.</p>}
                          {tags.map((t) => <span key={t} className="chip">#{t}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="status">
                  <button className="status-toggle" onClick={() => setMetaOpen(!metaOpen)} aria-expanded={metaOpen}>
                    <ChevronUp size={13} className="chev" /> Links and tags
                  </button>
                  <span className="status-right">
                    <span>{words} {words === 1 ? 'word' : 'words'}</span>
                    <span className={`save ${saving ? 'saving' : ''}`}><i />{saving ? 'Saving' : 'Saved'}</span>
                  </span>
                </footer>
              </div>
              <LocalGraph />
            </div>
          ) : (
            <div className="empty">
              <div className="empty-mark" />
              <h2>No note open</h2>
              <p>Pick a note from the sidebar, or start a new one with <kbd>Alt N</kbd>.</p>
              <button className="btn primary" onClick={() => s.createNote()}>New note</button>
            </div>
          )}
        </main>
      </div>
      <Palette />
      <Toasts />
    </div>
  )
}
