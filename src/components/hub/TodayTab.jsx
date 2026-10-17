import { useState } from 'react'
import Markdown from '../../Markdown'
import { call } from '../../api'

const todayISO = () => new Date().toLocaleDateString('en-CA')
const daysUntil = (d) => Math.round((new Date(d + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 864e5)
const when = (n) => (n < 0 ? `${-n}d overdue` : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n}d`)

export default function TodayTab({ graph, onSelect, onChanged }) {
  const [error, setError] = useState(null)
  const upcoming = (graph.deadlines ?? [])
    .filter(d => !d.done && d.date && daysUntil(d.date) <= 14)
    .sort((a, b) => a.date.localeCompare(b.date))

  async function toggle(index, done) {
    try { await call('task', { path: graph.briefing.path, index, done }); onChanged() }
    catch (e) { setError(e.message) }
  }

  return (
    <>
      <section aria-label="Deadlines in the next two weeks" className="mb-5">
        <h3 className="mb-2 text-sm font-semibold text-ink">Coming up</h3>
        {upcoming.length === 0
          ? <p className="text-sm text-mute">No deadlines in the next two weeks. New ones are picked up from email and docs each morning.</p>
          : (
            <ul className="space-y-1.5">
              {upcoming.map((d, i) => {
                const n = daysUntil(d.date)
                return (
                  <li key={i} className="flex items-baseline gap-3 text-sm">
                    <span className={`w-20 shrink-0 tabular-nums ${n <= 1 ? 'text-[#FBBF24]' : 'text-mute'}`}>{when(n)}</span>
                    <span className="text-ink/90">
                      {d.note ? <a className="cursor-pointer underline decoration-white/20 underline-offset-4 hover:decoration-[#5EEAD4]" onClick={() => onSelect(d.note)}>{d.title}</a> : d.title}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
      </section>
      {error && <p className="mb-3 text-sm text-[#F472B6]">{error}</p>}
      {graph.briefing
        ? <div className="briefing border-t border-white/10 pt-4"><Markdown body={graph.briefing.body} onSelect={onSelect} onToggleTask={toggle} /></div>
        : <p className="text-sm text-mute">No briefing yet. Press <b>Refresh briefing</b> to make one now.</p>}
    </>
  )
}
