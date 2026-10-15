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
        <Markdown body={note.body} onSelect={onSelect} />
        <p className="mt-8 text-sm text-mute">
          Connected to {note.degree} other note{note.degree === 1 ? '' : 's'}.
        </p>
      </div>
    </aside>
  )
}
