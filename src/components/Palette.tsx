import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { download } from '../lib/text'

type Item = { label: string; hint?: string; run: () => void }

export default function Palette() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (s.paletteOpen) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 0) } }, [s.paletteOpen])

  const items = useMemo<Item[]>(() => {
    const active = s.notes.find((n) => n.id === s.activeId)
    const cmds: Item[] = [
      { label: 'New note', hint: 'Alt N', run: () => s.createNote() },
      { label: "Open today's note", run: () => s.dailyNote() },
      { label: 'View: Edit', run: () => s.setView('edit') },
      { label: 'View: Split', run: () => s.setView('split') },
      { label: 'View: Preview', run: () => s.setView('preview') },
      { label: 'View: Graph', run: () => s.setView('graph') },
      { label: s.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', run: () => s.toggleTheme() },
      { label: 'Toggle sidebar', run: () => s.toggleSidebar() },
    ]
    if (active) {
      cmds.push(
        { label: `Export “${active.title}” as .md`, run: () => download(`${active.title}.md`, active.content, 'text/markdown') },
        { label: `Delete “${active.title}”`, run: () => s.deleteNote(active.id) },
      )
    }
    const noteItems: Item[] = s.notes.map((n) => ({ label: n.title, hint: 'note', run: () => s.openNote(n.id) }))
    const query = q.trim().toLowerCase()
    const all = [...noteItems, ...cmds]
    const filtered = query ? all.filter((x) => x.label.toLowerCase().includes(query)) : all
    if (query && !s.notes.some((n) => n.title.toLowerCase() === query)) {
      filtered.push({ label: `Create note “${q.trim()}”`, run: () => s.createNote(q.trim()) })
    }
    return filtered.slice(0, 12)
  }, [q, s.notes, s.activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!s.paletteOpen) return null
  const close = () => s.setPalette(false)
  const pick = (it?: Item) => { if (it) { close(); it.run() } }

  return (
    <div className="overlay" onMouseDown={close}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          placeholder="Jump to a note or run a command…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setI(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((i + 1) % Math.max(items.length, 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI((i - 1 + items.length) % Math.max(items.length, 1)) }
            else if (e.key === 'Enter') pick(items[i])
            else if (e.key === 'Escape') close()
          }}
        />
        <div className="palette-list">
          {items.map((it, idx) => (
            <button key={it.label + idx} className={idx === i ? 'active' : ''} onMouseEnter={() => setI(idx)} onClick={() => pick(it)}>
              <span>{it.label}</span>{it.hint && <kbd>{it.hint}</kbd>}
            </button>
          ))}
          {items.length === 0 && <p className="muted">Nothing found.</p>}
        </div>
      </div>
    </div>
  )
}
