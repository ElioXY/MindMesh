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

export default function Graph() {
  const notes = useStore((s) => s.notes)
  const activeId = useStore((s) => s.activeId)
  const openNote = useStore((s) => s.openNote)
  const theme = useStore((s) => s.theme)

  const { baseNodes, baseEdges, key } = useMemo(() => {
    const byTitle = new Map(notes.map((n) => [norm(n.title), n.id]))
    const links: Array<[string, string]> = []
    const seen = new Set<string>()
    for (const n of notes) {
      for (const t of linksOf(n)) {
        const target = byTitle.get(t)
        if (target && target !== n.id && !seen.has(`${n.id}>${target}`)) {
          seen.add(`${n.id}>${target}`)
          links.push([n.id, target])
        }
      }
    }
    const degree = new Map<string, number>()
    for (const [s, t] of links) {
      degree.set(s, (degree.get(s) ?? 0) + 1)
      degree.set(t, (degree.get(t) ?? 0) + 1)
    }
    const pos = layout(notes.map((n) => n.id), links)
    const baseNodes: GNode[] = notes.map((n, i) => ({
      id: n.id,
      type: 'note',
      position: { x: pos.get(n.id)!.x, y: pos.get(n.id)!.y },
      data: { label: n.title, degree: degree.get(n.id) ?? 0, active: false, i },
    }))
    const baseEdges: Edge[] = links.map(([s, t]) => ({
      id: `${s}>${t}`, source: s, target: t, type: 'straight', style: { stroke: 'var(--edge)', strokeWidth: 1.5 },
    }))
    return { baseNodes, baseEdges, key: notes.map((n) => n.id).join() + '|' + [...seen].join() }
  }, [notes])

  const [nodes, setNodes, onNodesChange] = useNodesState<GNode>(baseNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(baseEdges)

  useEffect(() => { setNodes(baseNodes); setEdges(baseEdges) }, [key]) 
  useEffect(() => {
    setNodes((ns) => ns.map((n) => {
      const title = notes.find((x) => x.id === n.id)?.title ?? n.data.label
      return { ...n, data: { ...n.data, label: title, active: n.id === activeId } }
    }))
  }, [activeId, notes, setNodes])

  return (
    <div className="graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={(_, n) => openNote(n.id)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        colorMode={theme}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--line)" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap pannable zoomable maskColor="var(--mask)" nodeColor="var(--dot)" />
      </ReactFlow>
      <div className="graph-hint">Click a note to open it. Drag to rearrange.</div>
    </div>
  )
}
