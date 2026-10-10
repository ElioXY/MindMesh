import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from '@xyflow/react'
import {
  Plus, Search, Command, PanelLeftClose, PanelRightClose, ChevronDown, MoreHorizontal, 
  Sparkles, Share2, Download, LayoutGrid, Network, Clock3, Star, Settings2, CircleHelp,
  StickyNote, Folder, Trash2, Check, X, Palette,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'
import './App.css'

type MindData = {
  label: string
  color: string
  description: string
}

type MindNode = Node<MindData>

const colors = [
  '#9B8CFF', '#65C9A5', '#F5B86B', '#F08BB4', '#70B9F4', '#B7C77B',
]

const initialNodes: MindNode[] = [
  {
    id: 'root',
    type: 'mind',
    position: { x: 360, y: 230 },
    data: {
      label: 'My next big idea',
      color: '#9B8CFF',
      description: 'The central idea. Everything starts here.'
    },
  },

  {
    id: 'research',
    type: 'mind',
    position: { x: 90, y: 75 },
    data: {
      label: 'Research',
      color: '#70B9F4',
      description: 'Collect inspiration and explore possibilities.'
    },
  },

  {
    id: 'planning',
    type: 'mind',
    position: { x: 670, y: 55 },
    data: {
      label: 'Planning',
      color: '#F5B86B',
      description: 'Organize your thoughts and create a roadmap.'
    },
  },

  {
    id: 'design',
    type: 'mind',
    position: { x: 80, y: 410 },
    data: {
      label: 'Design',
      color: '#F08BB4',
      description: 'Create the visual representation of your ideas.'
    },
  },

  {
    id: 'build',
    type: 'mind',
    position: { x: 700, y: 390 },
    data: {
      label: 'Build',
      color: '#65C9A5',
      description: 'Transform your ideas into reality.'
    },
  },
]

const initialEdges: Edge[] = [
  {id: 'e1', source: 'root', target: 'research', animated: true, style: { stroke: '70B9F4', strokeWidth: 2 }},
  {id: 'e2', source: 'root', target: 'planning', animated: true, style: { stroke: 'F5B86B', strokeWidth: 2 }},
  {id: 'e3', source: 'root', target: 'design', animated: true, style: { stroke: 'F08BB4', strokeWidth: 2 }},
  {id: 'e4', source: 'root', target: 'build', animated: true, style: { stroke: '65C9A5', strokeWidth: 2 }},
]

function loadSaved<T,>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : fallback
  } catch {
    return fallback
  }
}

function MindNodeView({ data, selected }: NodeProps<MindNode>) {
  return (
    <div
      className={`mind-node ${selected ? 'mind-node-selected' : ''}`} 
      style={{ '--node-color': data.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} />
      <div className="node-accent" />
      <div className="node-content">
        <span className="node-dot" />
        <span className="node-label">{data.label}</span>
      </div>
      {data.description && (
        <div className="node-description">{data.description}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
    )   
}

const nodeTypes = {
  mind: MindNodeView,
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<MindNode>(
    (loadSaved<MindNode[]>)('mindmesh-nodes', initialNodes),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    loadSaved<Edge[]>('mindmesh-edges', initialEdges),
  )
  const [selectedId, setSelectedId] = useState<string | null>('root')
  const [query, setQuery] = useState<string>('')
  const [mapName, setMapName] = useState<string> ('My Mind Map')
  const [editingMapName, setEditingMapName] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    localStorage.setItem('mindmesh-nodes', JSON.stringify(nodes))
    localStorage.setItem('mindmesh-edges', JSON.stringify(edges))
    setSaved(true)
  }, [nodes, edges])

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null


  const filteredNodes = useMemo(
    () => nodes.filter((node) => 
      node.data.label.toLowerCase().includes(query.toLowerCase()),
  ),
  [nodes, query],
)

const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge({
      ...connection,
      id: `edge-${Date.now()}`,
      animated: true,
      style: { stroke: '#8f83ee', strokeWidth: 2 },
    }, current))
  }, [setEdges])

const addNode = useCallback(() => {
  const id = `node-${Date.now()}`
  const color = colors[Math.floor(Math.random() * colors.length)]
  const newNode: MindNode = {
    id,
    type: 'mind',
    position: { 
      x: 300 + Math.random() * 180, 
      y: 180 + Math.random() * 160,},
    data: {
      label: 'New Idea',
      color,
      description: 'Click this node and edit tyour idea',
    },
  }
  setNodes((current) => [...current, newNode])
  setSelectedId(id)
  setSaved(false)
}, [setNodes])

const updateSelected = (patch: Partial<MindData>) => {
  if (!selectedNode) return
  setNodes((current) => current.map((node) => 
    node.id === selectedNode.id
      ? { ...node, data: { ...node.data, ...patch } }
      : node
  ))
  setSaved(false)
}

const deleteSelected = () => {
  if (!selectedNode) return
  setNodes((current) => current.filter((node) => node.id !== selectedId))
  setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId))
  setSelectedId(null)
}

const exportMap = () => {
  const blob = new Blob([JSON.stringify({ name: mapName, nodes, edges }, null, 2)], { type: 'application/json' },)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'mindmesh-map.json'
  link.click()
  URL.revokeObjectURL(url)
}

return (
  <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Network size={19} /></div>
        <span>mindmesh<span className="brand-period">.</span></span>
        <span className="brand-badge">BETA</span>
      </div>

      <div className="topbar-center">
        <span className="save-dot" />
        <span>{saved ? 'All changes saved' : 'Saving changes...'}</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" title="Export map" onClick={exportMap}><Download size={17} /></button>
        <button className="share-button" onClick={exportMap}><Share2 size={15} />Export map</button>
        <div className="avatar">E</div>
      </div>
    </header>

    <div className="workspace">
      {sidebarOpen && (
        <aside className="sidebar">
          <button className="new-map-button" onClick={addNode}>
            <Plus size={17} />New Idea <span> ⌘ K</span>
          </button>

          <div className="sidebar-section">
            <div className="section-label">WORKSPACE<MoreHorizontal size={16} /></div>
            <button className = "nav-item active"><LayoutGrid size={17} />All mind maps <span className="nav-count">1</span></button>
            <button className = "nav-item"><Clock3 size={17} />Recently opened </button>
          </div>

          <div className="sidebar-section map-list-section">
            <div className="section-label">YOUR MAPS <Plus size={15} onClick={addNode} /></div>
            <button className = "map-list-item selected">
              <span className="map list-icon"><Network size={15} /></span>
              <span className="map-list-text">{mapName}</span>
              <span className="map-list-text">Untitled notes</span>
            </button>
          </div>























    </div>)