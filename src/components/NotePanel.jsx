import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { colorFor, TYPE_LABELS } from '../theme'

// Obsidian syntax → plain markdown: [[Note|alias]] → link, callouts → bold heading, drop the H1.
function toMarkdown(body) {
  return body
    .replace(/^#\s+.*\n?/, '')
    .replace(/\[\[([^\]|#]+)(#[^\]|]*)?(\|([^\]]*))?\]\]/g, (_, t, _h, _a, alias) =>
      `[${alias || t.split('/').pop()}](#note:${encodeURIComponent(t.split('/').pop().trim())})`)
    .replace(/^>\s*\[!\w+\]\s*(.*)$/gm, (_, title) => (title ? `> **${title}**\n>` : '>'))
}

export default function NotePanel({ note, onSelect, onClose }) {
  if (!note) return null
  return (
    <aside className="fixed z-20 bg-slate-950/90 backdrop-blur-xl border-slate-800 overflow-y-auto
      inset-x-0 bottom-0 max-h-[60vh] rounded-t-2xl border-t
      md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:max-h-none md:w-[440px] md:rounded-none md:border-t-0 md:border-l">
      <div className="sticky top-0 bg-slate-950/95 px-6 pt-5 pb-3 flex items-start gap-3">
        <span className="mt-2 h-3 w-3 shrink-0 rounded-full" style={{ background: colorFor(note.type), boxShadow: `0 0 12px ${colorFor(note.type)}` }} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{note.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            {TYPE_LABELS[note.type] || 'Note'} · {note.degree} connection{note.degree === 1 ? '' : 's'}
            {note.tags.length > 0 && ' · ' + note.tags.map(t => `#${t}`).join(' ')}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white text-2xl leading-none px-2">×</button>
      </div>
      <div className="note px-6 pb-10">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          urlTransform={url => url}
          components={{
            a: ({ href, children }) =>
              href?.startsWith('#note:')
                ? <a onClick={e => { e.preventDefault(); onSelect(decodeURIComponent(href.slice(6))) }}>{children}</a>
                : <a href={href} target="_blank" rel="noreferrer">{children}</a>,
          }}
        >
          {toMarkdown(note.body)}
        </ReactMarkdown>
      </div>
    </aside>
  )
}
