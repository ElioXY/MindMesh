import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReacFlow,
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
  Plus, Search, Command, PanelLeftClose, PanelRightClose, ChevronDown, MoreHorizontal
}