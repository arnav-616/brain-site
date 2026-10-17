import Markdown from '../Markdown'
import { colorOf, TYPE_LABELS } from '../theme'

const day = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function NotePanel({ note, topics, onSelect, onClose }) {
  if (!note) return null
  const color = colorOf(note, topics)
  return (
    <aside aria-label={note.title} className="glass panel-enter fixed z-20 overflow-y-auto
      inset-x-0 bottom-0 max-h-[62vh] rounded-t-3xl
      md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:max-h-none md:w-[460px] md:rounded-3xl">
      <div className="sticky top-0 z-10 flex items-start gap-3 px-6 pt-6 pb-4 bg-gradient-to-b from-[#0d0f2a] via-[#0d0f2a]/95 to-transparent">
        <span className="mt-2.5 h-3 w-3 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 14px 2px ${color}` }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-ink leading-snug">{note.title}</h2>
          <p className="mt-1 text-sm text-mute">
            {TYPE_LABELS[note.type] || 'Note'}
            {note.topic && <>, in <span style={{ color }}>{note.topic}</span></>}
            {note.created && <>, added {day(note.created)}</>}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close note" className="btn-icon">×</button>
      </div>
      <div className="px-6 pb-10">
        {note.type === 'project' && <ProjectCard meta={note.meta ?? {}} />}
        <Markdown body={note.body} onSelect={onSelect} />
        <p className="mt-8 text-sm text-mute">
          Connected to {note.degree} other note{note.degree === 1 ? '' : 's'}.
        </p>
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
