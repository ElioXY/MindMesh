import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { norm } from '../lib/text'

type Suggest = { start: number; query: string; index: number }

export default function Editor({ id, content }: { id: string; content: string }) {
  const notes = useStore((s) => s.notes)
  const update = useStore((s) => s.updateContent)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [suggest, setSuggest] = useState<Suggest | null>(null)

  const matches = useMemo(() => {
    if (!suggest) return []
    const q = norm(suggest.query)
    return notes
      .filter((n) => n.id !== id && norm(n.title).includes(q))
      .sort((a, b) => Number(norm(b.title).startsWith(q)) - Number(norm(a.title).startsWith(q)))
      .slice(0, 6)
  }, [suggest, notes, id])

  useEffect(() => { setSuggest(null) }, [id])

  function detect(value: string, caret: number) {
    const before = value.slice(0, caret)
    const open = before.lastIndexOf('[[')
    if (open < 0) return setSuggest(null)
    const typed = before.slice(open + 2)
    if (/[\]\n]/.test(typed)) return setSuggest(null)
    setSuggest((s) => ({ start: open + 2, query: typed, index: s ? Math.min(s.index, 5) : 0 }))
  }

  function insert(title: string) {
    const el = ref.current
    if (!el || !suggest) return
    const caret = el.selectionStart
    const after = content.slice(0, suggest.start) + title + closing + after
    