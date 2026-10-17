import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// Obsidian syntax → plain markdown: [[Note|alias]] → link, callouts → bold heading, drop the H1.
function toMarkdown(body) {
  return body
    .replace(/^#\s+.*\n?/, '')
    .replace(/\[\[([^\]|#]+)(#[^\]|]*)?(\|([^\]]*))?\]\]/g, (_, t, _h, _a, alias) =>
      `[${alias || t.split('/').pop()}](#note:${encodeURIComponent(t.split('/').pop().trim())})`)
    .replace(/^>\s*\[!\w+\]\s*(.*)$/gm, (_, title) => (title ? `> **${title}**\n>` : '>'))
}

// Renders a note body; wikilinks call onSelect instead of navigating.
// With onToggleTask, task checkboxes become clickable: onToggleTask(index, checked).
export default function Markdown({ body, onSelect, onToggleTask }) {
  let task = 0
  return (
    <div className="note">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={url => url}
        components={{
          a: ({ href, children }) =>
            href?.startsWith('#note:')
              ? <a href={href} onClick={e => { e.preventDefault(); onSelect(decodeURIComponent(href.slice(6))) }}>{children}</a>
              : <a href={href} target="_blank" rel="noreferrer">{children}</a>,
          input: ({ type, checked }) => {
            if (type !== 'checkbox') return null
            const i = task++
            return <input type="checkbox" checked={!!checked} disabled={!onToggleTask}
              onChange={e => onToggleTask?.(i, e.target.checked)} aria-label="Mark done" />
          },
        }}
      >
        {toMarkdown(body)}
      </ReactMarkdown>
    </div>
  )
}
