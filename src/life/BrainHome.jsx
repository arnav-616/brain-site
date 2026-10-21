import { useMemo, useState } from 'react'
import { call } from '../api'
import { parseBriefing, parseTasks, section } from '../../lib/briefing.js'
import { JobStatus, NoteLink } from './ui'
import TaskList from './TaskList'
import Weather from './Weather'
import site from '../site'

const todayISO = () => new Date().toLocaleDateString('en-CA')
const daysUntil = (d) => Math.round((new Date(d + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 864e5)
const when = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`)
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// The part of the day decides what the card leads with.
function partOfDay() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
}

// One plain sentence about where the day stands. Overdue items never count here.
function summary(part, open, done, next) {
  const total = open + done
  // The countdown chip already shows the next deadline; only mention it when nothing else is going on.
  const nextUp = next && open + done === 0 ? ` Next up: ${next.title.split(' (')[0]}, ${when(daysUntil(next.date)).toLowerCase()}.` : ''
  if (total === 0) return `Nothing needs you today.${nextUp}`
  if (part === 'morning') return `${plural(open, 'thing')} need${open === 1 ? 's' : ''} you today.${nextUp}`
  if (part === 'afternoon') return done ? `${done} of ${total} done so far. ${plural(open, 'thing')} left.` : `${plural(open, 'thing')} still need${open === 1 ? 's' : ''} you today.`
  if (open === 0) return `You got through everything today. Nice.${nextUp}`
  return done ? `You finished ${done} of ${total} today. ${open} left, which can wait for tomorrow.` : `${plural(open, 'thing')} left from today. Pick one for tomorrow morning.`
}

// Floats over the brain on the home view: the day at a glance, shaped by the time of day.
export default function BrainHome({ graph, onSelect, reload, job, go, open, setOpen }) {
  const [error, setError] = useState(null)
  const today = todayISO()
  const part = partOfDay()
  const needs = useMemo(() => section(parseBriefing(graph.briefing?.body), 'needs'), [graph])
  const tasks = useMemo(() => parseTasks(needs?.body, today), [needs, today])
  const openCount = tasks.filter(t => !t.done && !t.overdue && !t.later).length
  const doneCount = tasks.filter(t => t.done).length
  const upcoming = (graph.deadlines ?? []).filter(d => !d.done && d.date && daysUntil(d.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))
  const tomorrow = upcoming.filter(d => daysUntil(d.date) <= 2)
  const addedToday = graph.nodes.filter(n => n.created === today && !['daily', 'inbox'].includes(n.type))
  const stale = graph.briefing?.created && graph.briefing.created !== today
  // Calendar: today's events (tomorrow's in the evening). Reminders: open ones due soon or undated.
  const calDay = part === 'evening' ? new Date(Date.now() + 864e5).toLocaleDateString('en-CA') : today
  const events = (graph.calendar?.items ?? []).filter(e => new Date(e.start).toLocaleDateString('en-CA') === calDay && !/Holidays|Birthdays/.test(e.calendar)).slice(0, 5)
  const reminders = (graph.reminders?.items ?? []).filter(r => !r.due || new Date(r.due) - Date.now() < 3 * 864e5).slice(0, 4)
  const unread = graph.email?.items.filter(i => i.category === 'action' && !i.handled).length ?? 0

  async function snooze(index) {
    const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('en-CA')
    try { await call('snooze', { path: graph.briefing.path, index: needs.taskOffset + index, date: tomorrow }); reload() }
    catch (e) { setError(e.message) }
  }
  async function toggle(index, done) {
    try { await call('task', { path: graph.briefing.path, index: needs.taskOffset + index, done }); reload() }
    catch (e) { setError(e.message) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="glass fixed left-4 top-[5.5rem] z-20 rounded-full px-4 py-2 text-sm text-ink md:left-[264px] md:top-[6.5rem]">
        Good {part}{openCount ? `, ${openCount} left today` : ''}
      </button>
    )
  }
  const total = openCount + doneCount
  return (
    <aside aria-label="Your day" className="glass panel-enter fixed z-20 overflow-y-auto rounded-3xl
      inset-x-2 bottom-[4.75rem] max-h-[55vh] p-5
      md:inset-x-auto md:bottom-auto md:left-[264px] md:top-[6.5rem] md:max-h-[calc(100vh-15rem)] md:w-[380px]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink/80">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="mt-1 font-display text-xl leading-tight text-ink">Good {part}, {site.owner}</h1>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Hide" className="btn-icon">–</button>
      </div>
      {upcoming[0] && daysUntil(upcoming[0].date) <= 45 && (
        <button onClick={() => upcoming[0].note && onSelect(upcoming[0].note)}
          className="mt-3 inline-flex items-baseline gap-2 rounded-full border border-[#A78BFA]/30 bg-[#A78BFA]/10 px-3 py-1 text-sm text-ink">
          <span className="font-display text-[#C4B5FD]">{daysUntil(upcoming[0].date) || 'Today'}</span>
          <span className="text-ink/80">{daysUntil(upcoming[0].date) ? `day${daysUntil(upcoming[0].date) === 1 ? '' : 's'} to ` : ''}{upcoming[0].title.split(' (')[0]}</span>
        </button>
      )}
      <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{summary(part, openCount, doneCount, upcoming[0])}</p>
      <div className="mt-1"><Weather location={graph.sources?.location} /></div>
      {total > 0 && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={doneCount} aria-valuemax={total} aria-label="Today's progress">
          <div className="h-1 rounded-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4] transition-[width] duration-500" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      )}
      {stale && (
        <p className="mt-3 rounded-xl bg-[#FBBF24]/10 px-3 py-2 text-sm text-[#FBBF24]">
          These are from {graph.briefing.created === new Date(Date.now() - 864e5).toLocaleDateString('en-CA') ? "yesterday's" : 'an older'} briefing.{' '}
          <button disabled={job.busy} onClick={job.refresh} className="underline underline-offset-2">Refresh for today</button>
        </p>
      )}
      <div className="mt-3"><JobStatus job={job} /></div>
      {error && <p className="mb-2 text-sm text-[#F472B6]">{error}</p>}

      {needs
        ? <section className="mt-1"><TaskList tasks={tasks} onToggle={toggle} onSnooze={snooze} onSelect={onSelect} /></section>
        : <p className="mt-3 text-sm text-mute">No briefing yet. Press <b className="text-ink">Refresh</b> to pull in email, files and news.</p>}

      {(events.length > 0 || reminders.length > 0) && (
        <section className="mt-4 border-t border-white/10 pt-3 text-sm">
          {events.length > 0 && (
            <>
              <h2 className="mb-1 font-semibold text-ink">{part === 'evening' ? 'Tomorrow' : 'Today'} on your calendar</h2>
              <ul className="mb-2 space-y-0.5">{events.map((e, i) => <li key={i} className="flex gap-3"><span className="w-16 shrink-0 text-mute">{e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span><span className="text-ink/90">{e.title}</span></li>)}</ul>
            </>
          )}
          {reminders.length > 0 && (
            <>
              <h2 className="mb-1 font-semibold text-ink">From Reminders</h2>
              <ul className="space-y-0.5">{reminders.map((r, i) => <li key={i} className="text-ink/90">{r.title}{r.due && <span className="ml-2 text-xs text-mute">due {new Date(r.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}</li>)}</ul>
            </>
          )}
        </section>
      )}

      {part === 'evening' && (addedToday.length > 0 || tomorrow.length > 0) && (
        <section className="mt-4 space-y-3 border-t border-white/10 pt-3 text-sm">
          {addedToday.length > 0 && (
            <div>
              <h2 className="mb-1 font-semibold text-ink">Added to your brain today</h2>
              <p className="text-ink/85">{addedToday.slice(0, 6).map((n, i) => <span key={n.id}>{i > 0 && ', '}<NoteLink id={n.id} onSelect={onSelect} /></span>)}{addedToday.length > 6 && ` and ${addedToday.length - 6} more`}</p>
            </div>
          )}
          {tomorrow.length > 0 && (
            <div>
              <h2 className="mb-1 font-semibold text-ink">Due in the next two days</h2>
              <ul className="space-y-0.5">{tomorrow.map((d, i) => <li key={i} className="text-ink/85">{when(daysUntil(d.date))}: {d.note ? <NoteLink id={d.note} onSelect={onSelect}>{d.title}</NoteLink> : d.title}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      {part !== 'evening' && upcoming.length > 0 && (
        <section className="mt-4 border-t border-white/10 pt-3">
          <h2 className="mb-1.5 text-sm font-semibold text-ink">Coming up</h2>
          <ul className="space-y-1 text-sm">
            {upcoming.slice(0, 3).map((d, i) => (
              <li key={i} className="flex gap-3">
                <span className={`w-20 shrink-0 ${daysUntil(d.date) <= 2 ? 'text-[#FBBF24]' : 'text-mute'}`}>{when(daysUntil(d.date))}</span>
                <span className="min-w-0 text-ink/90">{d.note ? <NoteLink id={d.note} onSelect={onSelect}>{d.title}</NoteLink> : d.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => go('today')} className="action">Full briefing</button>
        <button onClick={() => go('inbox')} className="action action-quiet">Inbox{unread ? ` (${unread})` : ''}</button>
        <button disabled={job.busy} onClick={job.refresh} className="action action-quiet">Refresh</button>
      </div>
      <p className="mt-3 text-xs text-mute">Notes from today's briefing glow brighter in the brain.</p>
    </aside>
  )
}
