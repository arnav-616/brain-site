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
export default function Markdown({ body, onSelect }) {
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
        }}
      >
        {toMarkdown(body)}
      </ReactMarkdown>
    </div>
  )
}

