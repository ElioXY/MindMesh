import type { Note } from '../types'

export type FolderNode = { name: string; path: string; children: FolderNode[] }

export const cleanPath = (p: string) =>
  p.split('/').map((s) => s.replace(/[\\:*?"<>|]/g, '').trim()).filter(Boolean).join('/')

export const parentOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')
export const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1)
export const inFolder = (path: string, folder: string) => path === folder || path.startsWith(folder + '/')
export const replacePrefix = (path: string, oldP: string, newP: string) => newP + path.slice(oldP.length)

/** Explicit folders + folders implied by notes, with every ancestor included. */
export function allFolderPaths(notes: Note[], explicit: string[]): string[] {
  const set = new Set<string>()
  const add = (p: string) => {
    let cur = p
    while (cur) { set.add(cur); cur = parentOf(cur) }
  }
  explicit.forEach(add)
  notes.forEach((n) => n.folder && add(n.folder))
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function buildTree(paths: string[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>()
  const roots: FolderNode[] = []
  for (const path of paths) {
    nodes.set(path, { name: baseName(path), path, children: [] })
  }
  for (const path of paths) {
    const node = nodes.get(path)!
    const parent = nodes.get(parentOf(path))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
