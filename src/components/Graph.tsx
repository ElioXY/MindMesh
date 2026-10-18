import { useEffect, useMemo } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap, Handle, Position,
  useNodesState, useEdgesState, type Node, type Edge, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '../store'
import { linksOf, norm } from '../lib/text'

type GNode = Node<{ label: string; degree: number; active: boolean; i: number }>

const center = { opacity: 0, top: '50%', left: '50%', bottom: 'auto', transform: 'translate(-50%, -50%)', pointerEvents: 'none' as const }

function GraphNode({ data }: NodeProps<GNode>) {
  const size = 10 + Math.min(data.degree, 8) * 3
  return (
    <div className={`g-node ${data.active ? 'g-node-active' : ''}`} style={{ animationDelay: `${Math.min(data.i * 35, 600)}ms` }}>
      <div className="g-dotwrap">
        <Handle type="target" position={Position.Top} style={center} />
        <div className="g-dot" style={{ width: size, height: size }} />
        <Handle type="source" position={Position.Bottom} style={center} />
      </div>
      <div className="g-label">{data.label}</div>
    </div>
  )
}
const nodeTypes = { note: GraphNode }

/** Small force-directed layout, no extra dependency. */
function layout(ids: string[], links: Array<[string, string]>) {
  const n = ids.length
  const R = 120 + n * 14
  const pos = new Map(ids.map((id, i) => {
    const a = (i / Math.max(n, 1)) * Math.PI * 2
    return [id, { x: Math.cos(a) * R, y: Math.sin(a) * R, vx: 0, vy: 0 }]
  }))
  for (let it = 0; it < 250; it++) {
    const cool = 1 - it / 250
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = pos.get(ids[i])!, b = pos.get(ids[j])!
      let dx = a.x - b.x, dy = a.y - b.y
      const d2 = Math.max(dx * dx + dy * dy, 25)
      const f = 22000 / d2
      const d = Math.sqrt(d2)
      dx /= d; dy /= d
      a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f
    }
    for (const [s, t] of links) {
      const a = pos.get(s)!, b = pos.get(t)!
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.max(Math.hypot(dx, dy), 1)
      const f = (d - 130) * 0.04
      a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f
    }
    for (const p of pos.values()) {
      p.vx -= p.x * 0.01; p.vy -= p.y * 0.01
      p.x += Math.max(-30, Math.min(30, p.vx)) * cool
      p.y += Math.max(-30, Math.min(30, p.vy)) * cool
      p.vx *= 0.6; p.vy *= 0.6
    }
  }
  return pos
}
