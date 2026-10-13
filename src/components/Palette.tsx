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
            { label: `Export "${active.title}" as .md`, run: () => download(`${active.title}`)}
        )
    }