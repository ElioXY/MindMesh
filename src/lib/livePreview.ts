import { syntaxTree } from '@codemirror/language'
import { StateEffect, type Range } from '@codemirror/state'
import {
  Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate,
} from '@codemirror/view'

export const refreshEffect = StateEffect.define<null>()

const WIKI = /\[\[([^\]|#\n[]+?)(?:#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g
const TAG = /(^|\s)#([A-Za-z][\w/-]*)/g
const hide = Decoration.replace({})

class Check extends WidgetType {
  checked: boolean
  pos: number
  constructor(checked: boolean, pos: number) { super(); this.checked = checked; this.pos = pos }
  eq(o: Check) { return o.checked === this.checked && o.pos === this.pos }
  toDOM(view: EditorView) {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = this.checked
    box.className = 'cm-task'
    box.onmousedown = (e) => e.preventDefault()
    box.onclick = () => view.dispatch({ changes: { from: this.pos, to: this.pos + 3, insert: this.checked ? '[ ]' : '[x]' } })
    return box
  }
  ignoreEvent() { return false }
}

class Rule extends WidgetType {
  toDOM() { const e = document.createElement('span'); e.className = 'cm-rule'; return e }
}

function build(view: EditorView, known: () => Set<string>): DecorationSet {
  const { state } = view
  const doc = state.doc
  const focus = view.hasFocus
  const touches = (a: number, b: number) => focus && state.selection.ranges.some((r) => r.from <= b && r.to >= a)
  const lineTouch = (a: number, b: number) => touches(doc.lineAt(a).from, doc.lineAt(b).to)
  const out: Range<Decoration>[] = []
  const code: Array<[number, number]> = []
  const names = known()
  // `[[Note]]` parses as a shortcut link around `[Note]`; wikilink styling handles those instead
  const wikiInner = (n: { from: number; to: number }) =>
    doc.sliceString(n.from - 1, n.from) === '[' && doc.sliceString(n.to, n.to + 1) === ']'
  const eatSpace = (to: number) => (doc.sliceString(to, to + 1) === ' ' ? to + 1 : to)
  const lines = (from: number, to: number, fn: (lineFrom: number, i: number, last: boolean) => void) => {
    const a = doc.lineAt(from).number, b = doc.lineAt(to).number
    for (let n = a; n <= b; n++) fn(doc.line(n).from, n - a, n === b)
  }

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from, to,
      enter: (node) => {
        const name = node.name
        const parent = node.node.parent
        const h = /^ATXHeading(\d)$/.exec(name)
        if (h) {
          out.push(Decoration.line({ class: `cm-h cm-h${h[1]}` }).range(doc.lineAt(node.from).from))
          return
        }
        switch (name) {
          case 'HeaderMark':
            if (parent && /^ATXHeading/.test(parent.name) && !lineTouch(node.from, node.to))
              out.push(hide.range(node.from, eatSpace(node.to)))
            break
          case 'StrongEmphasis': out.push(Decoration.mark({ class: 'cm-strong' }).range(node.from, node.to)); break
          case 'Emphasis': out.push(Decoration.mark({ class: 'cm-em' }).range(node.from, node.to)); break
          case 'Strikethrough': out.push(Decoration.mark({ class: 'cm-strike' }).range(node.from, node.to)); break
          case 'InlineCode':
            out.push(Decoration.mark({ class: 'cm-code' }).range(node.from, node.to))
            code.push([node.from, node.to])
            break
          case 'EmphasisMark':
          case 'StrikethroughMark':
            if (parent && !touches(parent.from, parent.to)) out.push(hide.range(node.from, node.to))
            break
          case 'CodeMark':
            if (parent?.name === 'InlineCode' && !touches(parent.from, parent.to)) out.push(hide.range(node.from, node.to))
            break
          case 'FencedCode':
          case 'CodeBlock':
            code.push([node.from, node.to])
            lines(node.from, node.to, (lf, i, last) =>
              out.push(Decoration.line({ class: `cm-codeblock${i === 0 ? ' cm-cb-first' : ''}${last ? ' cm-cb-last' : ''}` }).range(lf)))
            break
          case 'Blockquote':
            lines(node.from, node.to, (lf) => out.push(Decoration.line({ class: 'cm-quote' }).range(lf)))
            break
          case 'QuoteMark':
            if (!lineTouch(node.from, node.to)) out.push(hide.range(node.from, eatSpace(node.to)))
            break
          case 'Link':
            if (wikiInner(node)) break
            out.push(Decoration.mark({ class: 'cm-link' }).range(node.from, node.to))
            break
          case 'LinkMark':
          case 'URL':
            if (parent && (parent.name === 'Link' || parent.name === 'Image') && !wikiInner(parent) && !touches(parent.from, parent.to))
              out.push(hide.range(node.from, node.to))
            break
          case 'HorizontalRule':
            if (!lineTouch(node.from, node.to)) out.push(Decoration.replace({ widget: new Rule() }).range(node.from, node.to))
            break
          case 'ListMark': out.push(Decoration.mark({ class: 'cm-listmark' }).range(node.from, node.to)); break
          case 'TaskMarker': {
            const checked = /x/i.test(doc.sliceString(node.from, node.to))
            out.push(Decoration.replace({ widget: new Check(checked, node.from) }).range(node.from, node.to))
            if (checked) out.push(Decoration.line({ class: 'cm-done' }).range(doc.lineAt(node.from).from))
            break
          }
          case 'Table':
            lines(node.from, node.to, (lf) => out.push(Decoration.line({ class: 'cm-table-line' }).range(lf)))
            break
        }
      },
    })
  }

  // wikilinks and #tags (text level, outside code)
  const seen = new Set<number>()
  const inCode = (p: number) => code.some(([a, b]) => p >= a && p < b)
  for (const { from, to } of view.visibleRanges) {
    const a = doc.lineAt(from).number, b = doc.lineAt(to).number
    for (let n = a; n <= b; n++) {
      if (seen.has(n)) continue
      seen.add(n)
      const line = doc.line(n)
      for (const m of line.text.matchAll(WIKI)) {
        const start = line.from + m.index!, end = start + m[0].length
        if (inCode(start)) continue
        const title = m[1].trim()
        const exists = names.has(title.toLowerCase())
        out.push(Decoration.mark({
          class: `cm-wikilink${exists ? '' : ' cm-wikilink-missing'}`,
          attributes: { 'data-title': title, title: exists ? 'Ctrl/⌘ + click to open' : 'Ctrl/⌘ + click to create' },
        }).range(start, end))
        if (!touches(start, end)) {
          const pipe = m[2] !== undefined ? line.text.indexOf('|', m.index! + 2) : -1
          out.push(hide.range(start, pipe >= 0 ? line.from + pipe + 1 : start + 2))
          out.push(hide.range(end - 2, end))
        }
      }
      for (const m of line.text.matchAll(TAG)) {
        const start = line.from + m.index! + m[1].length
        if (inCode(start)) continue
        out.push(Decoration.mark({ class: 'cm-tag' }).range(start, start + 1 + m[2].length))
      }
    }
  }
  return Decoration.set(out, true)
}

export function livePreview(known: () => Set<string>) {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) { this.decorations = build(view, known) }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged || u.selectionSet || u.focusChanged ||
          u.transactions.some((t) => t.effects.some((e) => e.is(refreshEffect))))
          this.decorations = build(u.view, known)
      }
    },
    { decorations: (v) => v.decorations },
  )
  return [plugin, EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none)]
}
