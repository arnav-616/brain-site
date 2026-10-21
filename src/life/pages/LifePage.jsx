import { useState } from 'react'
import { call } from '../../api'
import { Card, NoteLink, PageTitle } from '../ui'
import { Sparkline } from '../charts'

// Common parts of a student's life that don't have a page yet.
const SUGGESTED = [
  ['Health', 'Sleep, workouts, how you feel.'], ['Money', 'Budget, spending, savings, investing.'],
  ['Social', 'Friends, clubs, events, people to keep up with.'], ['Home', 'Housing, bills, errands.'],
  ['Hobbies', 'Things you do for fun.'], ['Reading', 'Books and articles worth keeping.'],
]
const endId = (e) => e.id ?? e
const firstLine = (body) => body.replace(/^#.*$/m, '').split('\n').map(l => l.trim()).find(l => l && !/^(#|-|\||>|\$\$)/.test(l)) ?? ''

// Every area of life as a card: what it is, what's in it, and what's recent.
export default function LifePage({ graph, onSelect, reload }) {
  const [error, setError] = useState(null)
  const areas = graph.nodes.filter(n => n.type === 'area' && !n.tags.includes('dashboard'))
  const projects = graph.nodes.filter(n => n.type === 'project')
  const neighbors = (id) => graph.links.flatMap(l => (endId(l.source) === id ? [endId(l.target)] : endId(l.target) === id ? [endId(l.source)] : []))
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const missing = SUGGESTED.filter(([name]) => !areas.some(a => a.id.toLowerCase() === name.toLowerCase()))

  async function start(name) {
    try { await call('createArea', { name }); reload() } catch (e) { setError(e.message) }
  }

  const checkins = graph.checkins?.items ?? []
  const series = (key) => {
    const byDay = {}
    checkins.forEach(c => { if (c[key] !== undefined) byDay[c.date] = c[key] })
    return Object.entries(byDay).sort().slice(-21).map(([date, value]) => ({ date, value }))
  }
  const workouts = checkins.filter(c => c.workout && c.date >= new Date(Date.now() - 7 * 864e5).toLocaleDateString('en-CA')).length
  const money = graph.money
  const courses = graph.nodes.filter(n => n.tags.includes('course'))

  return (
    <>
      <PageTitle title="Life" subtitle="Every part of your life, with what's in it. Click anything to open it." />
      {error && <p className="mb-4 text-sm text-[#F472B6]">{error}</p>}
      <div className="mb-8 grid gap-5 lg:grid-cols-3">
        <Card title="Health" emoji="💪">
          {checkins.length === 0 ? (
            <p className="text-sm text-mute">Type something like <b className="text-ink">slept 7h, gym, mood 4/5</b> in the capture bar and press <b className="text-ink">Log</b>. Sleep and mood show up here as charts.</p>
          ) : (
            <div className="space-y-4">
              <Sparkline title="Sleep" points={series('sleep')} color="#A78BFA" min={0} max={10} unit="h" />
              <Sparkline title="Mood" points={series('mood')} color="#5EEAD4" min={1} max={5} unit="/5" />
              <p className="text-sm text-mute">{workouts} workout{workouts === 1 ? '' : 's'} in the last 7 days.</p>
            </div>
          )}
        </Card>
        <Card title="Money" emoji="💵">
          {money?.bills?.length ? (
            <ul className="space-y-2 text-sm">
              {money.bills.slice(0, 6).map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="min-w-0 flex-1 text-ink/90">{b.title}</span>
                  {b.amount && <span className="text-ink">${b.amount}</span>}
                  <span className={b.paid ? 'text-mute' : 'text-[#FBBF24]'}>{b.paid ? 'Paid' : b.due ? `Due ${b.due.slice(5)}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-mute">Rent, tuition and bill emails show up here as they arrive: what's due and what's paid.</p>}
        </Card>
        <Card title="Courses" emoji="📚">
          {courses.length ? (
            <ul className="space-y-1.5 text-sm">{courses.map(c => <li key={c.id}><NoteLink id={c.id} onSelect={onSelect} /></li>)}</ul>
          ) : <p className="text-sm text-mute">Each class gets its own page with lectures and due dates once its slides or syllabus come in through Drive or your folders.</p>}
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {areas.map(a => {
          const linked = neighbors(a.id).map(id => byId.get(id)).filter(n => n && n.type !== 'daily')
            .sort((x, y) => (y.created ?? '').localeCompare(x.created ?? ''))
          return (
            <Card key={a.id} title={<button onClick={() => onSelect(a.id)} className="hover:text-[#5EEAD4]">{a.title}</button>}>
              <p className="text-sm text-ink/75">{firstLine(a.body)}</p>
              <p className="mt-3 text-xs text-mute">{linked.length} linked note{linked.length === 1 ? '' : 's'}{a.visibility === 'public' ? ', public' : ''}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {linked.slice(0, 5).map(n => <li key={n.id}><NoteLink id={n.id} onSelect={onSelect} /></li>)}
              </ul>
            </Card>
          )
        })}
        {projects.length > 0 && (
          <Card title="Projects">
            <ul className="space-y-2 text-sm">
              {projects.map(p => (
                <li key={p.id}>
                  <NoteLink id={p.id} onSelect={onSelect} />
                  {p.meta?.status && <span className="ml-2 text-xs text-mute">{p.meta.status}</span>}
                  {p.meta?.summary && <p className="text-mute">{p.meta.summary}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {missing.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[15px] font-semibold text-ink">Start another part of your life</h2>
          <p className="mb-4 text-sm text-mute">Each one becomes a private page that the morning refresh fills in and links to.</p>
          <div className="flex flex-wrap gap-3">
            {missing.map(([name, hint]) => (
              <button key={name} onClick={() => start(name)} className="glass rounded-2xl px-4 py-3 text-left hover:border-[#5EEAD4]/40">
                <p className="text-sm font-medium text-ink">+ {name}</p>
                <p className="text-xs text-mute">{hint}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
