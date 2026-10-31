import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'
import { linksOf, norm } from '../lib/text'
import { layout, type P } from '../lib/layout'

type GNode = { id: string; label: string; ghost?: boolean }
type Struct = { nodes: GNode[]; edges: Array<[string, string]> }
const EMPTY: Struct = { nodes: [], edges: [] }

function useTweened(target: Map<string, P>) {
  const [shown, setShown] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { current.current = target; setShown(target); return }
    const from = new Map(current.current)
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 480)
      const e = 1 - Math.pow(1 - k, 3)
      const m = new Map<string, P>()
      for (const [id, p] of target) {
        const f = from.get(id) ?? p
        m.set(id, { x: f.x + (p.x - f.x) * e, y: f.y + (p.y - f.y) * e })
      }
      current.current = m
      setShown(m)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return shown
}

const clip = (s: string, n = 18) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export default function LocalGraph() {
  const notes = useStore((s) => s.notes)
  const activeId = useStore((s) => s.activeId)
  const depth = useStore((s) => s.localDepth)
  const open = useStore((s) => s.localGraphOpen)
  const [hover, setHover] = useState<string | null>(null)

  const struct = useMemo<Struct>(() => {
    if (!open || !activeId) return EMPTY
    const byTitle = new Map(notes.map((n) => [norm(n.title), n]))
    const adj = new Map<string, Set<string>>()
    const missing = new Map<string, string[]>()
    const link = (a: string, b: string) => {
      if (!adj.has(a)) adj.set(a, new Set())
      if (!adj.has(b)) adj.set(b, new Set())
      adj.get(a)!.add(b); adj.get(b)!.add(a)
    }
    for (const n of notes) {
      for (const t of linksOf(n)) {
        const target = byTitle.get(t)
        if (target) { if (target.id !== n.id) link(n.id, target.id) }
        else { const arr = missing.get(n.id); if (arr) arr.push(t); else missing.set(n.id, [t]) }
      }
    }
    const level = new Map<string, number>([[activeId, 0]])
    const queue = [activeId]
    while (queue.length) {
      const id = queue.shift()!
      const d = level.get(id)!
      if (d >= depth) continue
      for (const nb of adj.get(id) ?? []) if (!level.has(nb)) { level.set(nb, d + 1); queue.push(nb) }
    }
    const title = new Map(notes.map((n) => [n.id, n.title]))
    const nodes: GNode[] = [...level.keys()].map((id) => ({ id, label: title.get(id) ?? '' }))
    const edges: Array<[string, string]> = []
    const seen = new Set<string>()
    for (const id of level.keys()) for (const nb of adj.get(id) ?? []) {
      if (!level.has(nb)) continue
      const k = id < nb ? `${id}>${nb}` : `${nb}>${id}`
      if (!seen.has(k)) { seen.add(k); edges.push([id, nb]) }
    }
    const ghosts = new Set<string>()
    for (const id of [...level.keys()]) for (const t of missing.get(id) ?? []) {
      const gid = `ghost:${t}`
      if (!ghosts.has(gid) && ghosts.size < 10) { ghosts.add(gid); nodes.push({ id: gid, label: t, ghost: true }) }
      if (ghosts.has(gid)) edges.push([id, gid])
    }
    return { nodes, edges }
  }, [notes, activeId, depth, open])

  const key = struct.nodes.map((n) => n.id).join() + '|' + struct.edges.map((e) => e.join('>')).join()
  const target = useMemo(
    () => layout(struct.nodes.map((n) => n.id), struct.edges, { pin: activeId ?? undefined, dist: 80, repel: 6000 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, activeId],
  )
  const shown = useTweened(target)

  const bounds = useMemo(() => {
    let minX = -110, maxX = 110, minY = -90, maxY = 90
    for (const p of shown.values()) {
      minX = Math.min(minX, p.x - 50); maxX = Math.max(maxX, p.x + 50)
      minY = Math.min(minY, p.y - 28); maxY = Math.max(maxY, p.y + 38)
    }
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
  }, [shown])

  const real = struct.nodes.filter((n) => !n.ghost).length
  const neighbors = useMemo(() => {
    const s = new Set<string>()
    if (hover) for (const [a, b] of struct.edges) { if (a === hover) s.add(b); if (b === hover) s.add(a) }
    return s
  }, [hover, struct])

  return (
    <aside className={`lg-shell ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="lg-panel">
        <div className="lg-head">
          <strong>Local graph</strong>
          <div className="lg-depth" role="group" aria-label="Depth">
            {[1, 2, 3].map((d) => (
              <button key={d} className={depth === d ? 'on' : ''} onClick={() => useStore.getState().setLocalDepth(d)} title={`Show notes ${d} link${d > 1 ? 's' : ''} away`}>{d}</button>
            ))}
          </div>
          <button className="icon-btn" title="Close" aria-label="Close local graph" onClick={() => useStore.getState().setLocalGraph(false)}><X size={15} /></button>
        </div>
        <svg className="lg-svg" viewBox={bounds} role="img" aria-label="Notes connected to the current note">
          <g>
            {struct.edges.map(([a, b]) => {
              const pa = shown.get(a), pb = shown.get(b)
              if (!pa || !pb) return null
              const hot = hover === a || hover === b
              return <line key={`${a}>${b}`} className={`lg-edge ${hot ? 'hot' : ''}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />
            })}
          </g>
          {struct.nodes.map((n, i) => {
            const p = shown.get(n.id) ?? { x: 0, y: 0 }
            const isActive = n.id === activeId
            const r = isActive ? 9 : n.ghost ? 5 : 6.5
            const dim = hover && hover !== n.id && !neighbors.has(n.id)
            return (
              <g
                key={n.id}
                transform={`translate(${p.x} ${p.y})`}
                className={`lg-node ${isActive ? 'active' : ''} ${n.ghost ? 'ghost' : ''} ${dim ? 'dim' : ''}`}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => (n.ghost ? useStore.getState().openByTitle(n.label) : useStore.getState().openNote(n.id))}
              >
                <g className="lg-pop" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                  <title>{n.ghost ? `Create “${n.label}”` : n.label}</title>
                  {isActive && <circle className="lg-ring" r={r + 5} />}
                  <circle className="lg-dot" r={r} />
                  <text y={r + 13} textAnchor="middle">{clip(n.label)}</text>
                </g>
              </g>
            )
          })}
        </svg>
        <div className="lg-foot">
          {real <= 1 && !struct.nodes.some((n) => n.ghost)
            ? 'No links yet. Type [[ to connect this note.'
            : `${real} ${real === 1 ? 'note' : 'notes'} within ${depth} ${depth === 1 ? 'link' : 'links'}`}
        </div>
      </div>
    </aside>
  )
}
