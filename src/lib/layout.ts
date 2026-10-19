export type P = { x: number; y: number }
type Opts = { pin?: string; dist?: number; repel?: number }

/** Small force-directed layout, no extra dependency. */
export function layout(ids: string[], links: Array<[string, string]>, opts: Opts = {}): Map<string, P> {
  const { pin, dist = 130, repel = 22000 } = opts
  const n = ids.length
  const R = dist + n * 10
  const pos = new Map<string, P & { vx: number; vy: number }>()
  ids.forEach((id, i) => {
    const a = (i / Math.max(n, 1)) * Math.PI * 2
    pos.set(id, id === pin ? { x: 0, y: 0, vx: 0, vy: 0 } : { x: Math.cos(a) * R, y: Math.sin(a) * R, vx: 0, vy: 0 })
  })
  for (let it = 0; it < 250; it++) {
    const cool = 1 - it / 250
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = pos.get(ids[i])!, b = pos.get(ids[j])!
      let dx = a.x - b.x, dy = a.y - b.y
      const d2 = Math.max(dx * dx + dy * dy, 25)
      const f = repel / d2
      const d = Math.sqrt(d2)
      dx /= d; dy /= d
      a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f
    }
    for (const [s, t] of links) {
      const a = pos.get(s), b = pos.get(t)
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.max(Math.hypot(dx, dy), 1)
      const f = (d - dist) * 0.04
      a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f
    }
    for (const [id, p] of pos) {
      if (id === pin) { p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; continue }
      p.vx -= p.x * 0.01; p.vy -= p.y * 0.01
      p.x += Math.max(-30, Math.min(30, p.vx)) * cool
      p.y += Math.max(-30, Math.min(30, p.vy)) * cool
      p.vx *= 0.6; p.vy *= 0.6
    }
  }
  return new Map([...pos].map(([id, p]) => [id, { x: p.x, y: p.y }]))
}
