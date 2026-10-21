import { useState } from 'react'
import Markdown from '../Markdown'
import { colorOf, TYPE_LABELS } from '../theme'
import useSwipeDown from '../useSwipeDown'
import { slug } from '../../lib/slug.js'

const day = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
import site from '../site'

const VAULT_NAME = site.vaultName

// The note reader. `connected` lists linked notes; `extra` renders under the body (e.g. link suggestions).
// Private notes (with a path) get "Open in Obsidian"; public ones get "Copy link".
export default function NotePanel({ note, topics, onSelect, onClose, connected = [], similar = [], extra }) {
  const [copied, setCopied] = useState(false)
  const swipe = useSwipeDown(onClose)
  if (!note) return null
  const color = colorOf(note, topics)
  const obsidian = note.path && `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent(note.path.replace(/\.md$/, ''))}`

  async function copyLink() {
    try {
      // The /n/ page has a preview image for this note, then opens it in the brain.
      await navigator.clipboard.writeText(`${location.origin}/n/${slug(note.id)}.html`)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — nothing to do */ }
  }

  return (
    <aside aria-label={note.title} className="glass panel-enter fixed z-[45] overflow-y-auto
      inset-x-0 bottom-0 max-h-[62vh] rounded-t-3xl
      md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:max-h-none md:w-[460px] md:rounded-3xl">
      <div {...swipe} className="sticky top-0 z-10 bg-gradient-to-b from-[#0d0f2a] via-[#0d0f2a]/95 to-transparent px-6 pb-4 pt-3 md:pt-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden />
        <div className="flex items-start gap-3">
          <span className="mt-2.5 h-3 w-3 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 14px 2px ${color}` }} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold leading-snug text-ink">{note.title}</h2>
            <p className="mt-1 text-sm text-mute">
              {TYPE_LABELS[note.type] || 'Note'}
              {note.topic && <>, in <span style={{ color }}>{note.topic}</span></>}
              {note.created && <>, added {day(note.created)}</>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close note" className="btn-icon">×</button>
        </div>
        <div className="mt-3 flex gap-2 pl-6">
          {obsidian
            ? <a href={obsidian} className="action action-quiet">Open in Obsidian</a>
            : <button onClick={copyLink} className="action action-quiet">{copied ? 'Link copied' : 'Copy link'}</button>}
        </div>
      </div>
      <div className="px-6 pb-10">
        {note.type === 'project' && <ProjectCard meta={note.meta ?? {}} />}
        <Markdown body={note.body} onSelect={onSelect} />
        {extra}
        {connected.length > 0 && (
          <section className="mt-8 border-t border-white/10 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">Connected notes ({connected.length})</h3>
            <ul className="flex flex-wrap gap-2">
              {connected.map(n => (
                <li key={n.id}>
                  <button onClick={() => onSelect(n.id)} className="chip" style={{ '--c': colorOf(n, topics) }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: colorOf(n, topics) }} />{n.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {similar.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-1 text-sm font-semibold text-ink">Similar ideas, not linked yet</h3>
            <p className="mb-2 text-xs text-mute">These use a lot of the same words.</p>
            <ul className="flex flex-wrap gap-2">
              {similar.map(n => (
                <li key={n.id}><button onClick={() => onSelect(n.id)} className="chip" style={{ '--c': colorOf(n, topics) }}>{n.title}</button></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}

// Header for project notes: screenshot, stack, and links from the note's frontmatter.
function ProjectCard({ meta }) {
  if (!meta.image && !meta.stack && !meta.url && !meta.repo) return null
  return (
    <div className="mb-5">
      {meta.image && <img src={meta.image} alt="" className="mb-3 aspect-video w-full rounded-2xl object-cover" />}
      {Array.isArray(meta.stack) && (
        <p className="flex flex-wrap gap-1.5">
          {meta.stack.map(s => <span key={s} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-ink/80">{s}</span>)}
        </p>
      )}
      <p className="mt-3 flex gap-3">
        {meta.url && <a href={meta.url} target="_blank" rel="noreferrer" className="action">Open it</a>}
        {meta.repo && <a href={meta.repo} target="_blank" rel="noreferrer" className="action action-quiet">See the code</a>}
      </p>
    </div>
  )
}
