import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  PanelLeft, X, Command, Pencil, Columns2, Eye, Network, Trash2, Link2, Hash, Download, Sun, Moon, ChevronUp,
} from 'lucide-react'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Palette from './components/Palette'
import Toasts from './components/Toasts'
import { download, linksOf, norm, tagsOf } from './lib/text'
import type { ViewMode } from './types'

const Graph = lazy(() => import('./components/Graph'))

const VIEWS: Array<[ViewMode, string, typeof Pencil]> = [
  ['edit', 'Edit', Pencil],
  ['split', 'Split', Columns2],
  ['preview', 'Preview', Eye],
  ['graph', 'Graph', Network],
]



 

