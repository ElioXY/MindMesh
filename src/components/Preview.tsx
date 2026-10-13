import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../store'
import { norm, wikiToMarkdown } from '../lib/text'

function Preview({ content }: { content: string }) {
  const notes = useStore((s) => s.notes)
  const openByTitle = useStore((s) => s.openByTitle)
  const known = useMemo(() => new Set(notes.map((n) => norm(n.title))), [notes])
  const md = useMemo(() => wikiToMarkdown(content), [content])

  return (
    <div className="preview markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (href?.startsWith('#wiki:')) {
              const title = decodeURIComponent(href.slice(6))
              return (
                <button
                  className={`wikilink ${known.has(norm(title)) ? '' : 'wikilink-missing'}`}
                  title={known.has(norm(title)) ? title : `Create “${title}”`}
                  onClick={() => openByTitle(title)}
                >
                  {children}
                </button>
              )
            }
            return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  )
}

export default memo(Preview)
