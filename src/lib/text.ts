import type { Note } from '../types'

const WIKILINK = /\[\[([^\]|#\n[]+?)(?:#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g
const TAG = /(^|\s)#([A-Za-z][\w/-]*)/g

export const norm = (s: string) => s.trim().toLowerCase()

const CODE = /```[\s\S]*?```|`[^`\n]*`/g
const stripCode = (c: string) => c.replace(CODE, ' ')

export function extractLinks(content: string): string[] {
  const out = new Set<string>()
  for (const m of stripCode(content).matchAll(WIKILINK)) out.add(norm(m[1]))
  return [...out]
}

export function extractTags(content: string): string[] {
  const out = new Set<string>()
  for (const m of stripCode(content).matchAll(TAG)) out.add(m[2].toLowerCase())
  return [...out]
}

/** Turn [[Title|alias]] into a markdown link the preview can intercept. */
export function wikiToMarkdown(content: string): string {
  const conv = (text: string) => text.replace(WIKILINK, (_, title: string, alias?: string) =>
    `[${alias?.trim() || title.trim()}](#wiki:${encodeURIComponent(title.trim())})`,
  )
  // leave code spans and fenced blocks untouched
  let out = ''
  let last = 0
  for (const m of content.matchAll(CODE)) {
    out += conv(content.slice(last, m.index)) + m[0]
    last = m.index + m[0].length
  }
  return out + conv(content.slice(last))
}

/** Rewrite [[Old]] → [[New]] everywhere (keeps #heading and |alias). */
export function renameLinks(content: string, oldTitle: string, newTitle: string): string {
  return content.replace(WIKILINK, (full, title: string) =>
    norm(title) === norm(oldTitle) ? full.replace(title, newTitle) : full,
  )
}

export function uniqueTitle(base: string, notes: Note[], ignoreId?: string): string {
  const taken = new Set(notes.filter((n) => n.id !== ignoreId).map((n) => norm(n.title)))
  const clean = base.replace(/[\\/:*?"<>|[\]#^]/g, '').trim() || 'Untitled'
  if (!taken.has(norm(clean))) return clean
  let i = 2
  while (taken.has(norm(`${clean} ${i}`))) i++
  return `${clean} ${i}`
}

export function snippet(content: string, q: string, len = 70): string {
  const i = content.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return content.slice(0, len).replace(/\s+/g, ' ')
  const start = Math.max(0, i - 20)
  return (start > 0 ? '…' : '') + content.slice(start, start + len).replace(/\s+/g, ' ')
}

export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

const linkCache = new WeakMap<Note, string[]>()
const tagCache = new WeakMap<Note, string[]>()

export function linksOf(n: Note): string[] {
  let v = linkCache.get(n)
  if (!v) { v = extractLinks(n.content); linkCache.set(n, v) }
  return v
}
export function tagsOf(n: Note): string[] {
  let v = tagCache.get(n)
  if (!v) { v = extractTags(n.content); tagCache.set(n, v) }
  return v
}
