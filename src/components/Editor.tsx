import { useEffect, useRef } from 'react'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { useStore } from '../store'
import { norm } from '../lib/text'
import { livePreview, refreshEffect } from '../lib/livePreview'
import { slashSource, wikiSource } from '../lib/completions'

const External = Annotation.define<boolean>()

export default function Editor({ id, content, live }: { id: string; content: string; live: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const liveComp = useRef(new Compartment())
  const initial = useRef({ content, live })
  const titlesKey = useStore((s) => s.notes.map((n) => n.title).join('\u0001'))

  useEffect(() => {
    const known = () => new Set(useStore.getState().notes.map((n) => norm(n.title)))
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial.current.content,
        extensions: [
          history(),
          drawSelection(),
          EditorView.lineWrapping,
          markdown({ base: markdownLanguage }),
          placeholder('Start writing. Type [[ to link a note or / for commands.'),
          autocompletion({
            override: [wikiSource(() => useStore.getState().notes, id), slashSource],
            icons: false,
            tooltipClass: () => 'mm-complete',
          }),
          keymap.of([...completionKeymap, indentWithTab, ...historyKeymap, ...defaultKeymap]),
          liveComp.current.of(initial.current.live ? livePreview(known) : []),
          EditorView.domEventHandlers({
            mousedown(e) {
              const el = (e.target as HTMLElement).closest('.cm-wikilink') as HTMLElement | null
              if (el && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                useStore.getState().openByTitle(el.dataset.title ?? '')
                return true
              }
              return false
            },
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !u.transactions.some((t) => t.annotation(External))) {
              useStore.getState().updateContent(id, u.state.doc.toString())
            }
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [id])

  // live / source toggle without losing cursor or undo history
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const known = () => new Set(useStore.getState().notes.map((n) => norm(n.title)))
    view.dispatch({ effects: liveComp.current.reconfigure(live ? livePreview(known) : []) })
  }, [live])

  // external content changes (rename rewrote links, undo delete…)
  useEffect(() => {
    const view = viewRef.current
    if (view && view.state.doc.toString() !== content) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content }, annotations: External.of(true) })
    }
  }, [content])

  // re-evaluate missing/existing link styling when titles change
  useEffect(() => { viewRef.current?.dispatch({ effects: refreshEffect.of(null) }) }, [titlesKey])

  return <div ref={host} className={`editor-wrap ${live ? 'cm-live' : 'cm-source'}`} />
}

