import { useState } from 'react'
import Markdown from '../Markdown'

const short = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// Today's tasks: open first, finished ones crossed off below, overdue ones tucked away on their own.
export default function TaskList({ tasks, onToggle, onSnooze, onSelect }) {
  const [showOverdue, setShowOverdue] = useState(false)
  const open = tasks.filter(t => !t.done && !t.overdue && !t.later)
  const later = tasks.filter(t => t.later)
  const done = tasks.filter(t => t.done)
  const overdue = tasks.filter(t => t.overdue)

  const Row = ({ t }) => (
    <li className="task-row flex items-start gap-3 py-1.5">
      <input type="checkbox" checked={t.done} onChange={e => onToggle(t.index, e.target.checked)}
        aria-label={t.done ? 'Mark not done' : 'Mark done'} className="mt-[5px] h-4 w-4 shrink-0 accent-[#5EEAD4]" />
      <div className={`task-text min-w-0 flex-1 text-sm ${t.done ? 'text-mute line-through decoration-white/30' : 'text-ink/90'}`}>
        <Markdown body={t.text} onSelect={onSelect} />
        {t.due && !t.done && <span className={`text-xs ${t.overdue ? 'text-[#F472B6]' : 'text-mute'}`}>{t.overdue ? 'Was due' : 'Due'} {short(t.due)}</span>}
      </div>
      {onSnooze && !t.done && (
        <button onClick={() => onSnooze(t.index)} title="Move to tomorrow" className="snooze shrink-0 rounded-lg px-2 py-0.5 text-xs text-mute hover:bg-white/10 hover:text-ink">
          Tomorrow
        </button>
      )}
    </li>
  )

  return (
    <div>
      {open.length === 0 && done.length > 0 && <p className="py-1.5 text-sm text-ink/90">All done for today.</p>}
      <ul>{open.map(t => <Row key={t.index} t={t} />)}</ul>
      {done.length > 0 && <ul className="mt-1 border-t border-white/5 pt-1">{done.map(t => <Row key={t.index} t={t} />)}</ul>}
      {later.length > 0 && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <p className="text-xs text-mute">Later</p>
          <ul>{later.map(t => <Row key={t.index} t={t} />)}</ul>
        </div>
      )}
      {overdue.length > 0 && (
        <div className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2">
          <button onClick={() => setShowOverdue(s => !s)} aria-expanded={showOverdue} className="flex w-full items-center gap-2 text-left text-sm text-mute hover:text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F472B6]" />
            {overdue.length} past {overdue.length === 1 ? 'its' : 'their'} deadline
            <span className="ml-auto text-xs">{showOverdue ? 'Hide' : 'Show'}</span>
          </button>
          {showOverdue && (
            <>
              <ul className="mt-1">{overdue.map(t => <Row key={t.index} t={t} />)}</ul>
              <p className="pb-1 text-xs text-mute">Tick one off if it's handled or no longer matters.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
