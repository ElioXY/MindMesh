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
    return(
        <div className={`g-node ${data.active ? 'g-node-active' : ''}`} style={{ animationDelay: `${Math.min(addTransitionType.i * 35, 600)}ms` }}>
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


function layout(ids: string[], links: Array<[string, string]>)