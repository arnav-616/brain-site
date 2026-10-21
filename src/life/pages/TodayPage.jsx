import { useMemo, useState } from 'react'
import Markdown from '../../Markdown'
import { call } from '../../api'
import { parseBriefing, parseTasks, section } from '../../../lib/briefing.js'
import TaskList from '../TaskList'
import site from '../../site'
import { flashcards } from '../../../lib/insights.js'
import { Card, JobStatus, NoteLink, PageTitle } from '../ui'
import { relDay } from '../dates'

const todayISO = () => new Date().toLocaleDateString('en-CA')
const daysUntil = (d) => Math.round((new Date(d + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 864e5)
const when = (n) => (n < 0 ? `${-n}d overdue` : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`)
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

export default function TodayPage({ graph, onSelect, reload, job, go }) {
  const [error, setError] = useState(null)
  const b = useMemo(() => parseBriefing(graph.briefing?.body), [graph])
  const card = useMemo(() => flashcards(graph.nodes, todayISO(), 1)[0], [graph])
  const [revealed, setRevealed] = useState(false)
  const stale = graph.briefing?.created && graph.briefing.created !== todayISO()

  async function toggle(offset, index, done) {
    try { await call('task', { path: graph.briefing.path, index: offset + index, done }); reload() }
    catch (e) { setError(e.message) }
  }
  const Section = ({ names, ...rest }) => {
    const s = section(b, ...names)
    if (!s) return null
    // Outside info arrives in an "Added by Claude" callout; on a card, unwrap it and say so once below.
    const fromWeb = /^>\s*\[!info\]/m.test(s.body)
    const body = fromWeb ? s.body.replace(/^>\s*\[!info\].*\n?/gm, '').replace(/^>\s?/gm, '') : s.body
    return (
      <Card title={s.title} emoji={s.emoji} {...rest}>
        <div className="briefing text-sm">
          <Markdown body={body} onSelect={onSelect} onToggleTask={(i, done) => toggle(s.taskOffset, i, done)} />
        </div>
        {fromWeb && <p className="mt-3 text-xs text-mute">Found on the web by Claude this morning. Sources are linked.</p>}
      </Card>
    )
  }

  const upcoming = (graph.deadlines ?? []).filter(d => !d.done && d.date && daysUntil(d.date) <= 30).sort((a, c) => a.date.localeCompare(c.date))
  const mail = graph.email?.items ?? []
  const urgent = mail.filter(m => ['action', 'school', 'project'].includes(m.category)).slice(0, 4)
  const recentFiles = (graph.files?.recent ?? []).filter(f => f.kind !== 'project').slice(0, 4)
  const feeds = graph.social?.platforms ?? []
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      <PageTitle title={`${greeting()}, ${site.owner}`} subtitle={`${date}${stale ? `. This briefing is from ${relDay(graph.briefing.created).toLowerCase()}.` : ''}`}>
        <div className="flex flex-wrap gap-2">
          <button disabled={job.busy} onClick={job.refresh} className="action">Refresh everything</button>
          <button disabled={job.busy} onClick={job.tidy} className="action action-quiet">Tidy inbox</button>
        </div>
      </PageTitle>
      <JobStatus job={job} />
      {error && <p className="mb-4 text-sm text-[#F472B6]">{error}</p>}

      {!graph.briefing ? (
        <Card title="No briefing yet">
          <p className="text-sm text-mute">Press <b className="text-ink">Refresh everything</b> to pull in email, files and news and write today's briefing.</p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {section(b, 'needs') && (
              <Card title={section(b, 'needs').title} emoji={section(b, 'needs').emoji}>
                <TaskList tasks={parseTasks(section(b, 'needs').body, todayISO())} onSelect={onSelect}
                  onToggle={(i, done) => toggle(section(b, 'needs').taskOffset, i, done)}
                  onSnooze={async (i) => {
                    try { await call('snooze', { path: graph.briefing.path, index: section(b, 'needs').taskOffset + i, date: new Date(Date.now() + 864e5).toLocaleDateString('en-CA') }); reload() }
                    catch (e) { setError(e.message) }
                  }} />
              </Card>
            )}
            {urgent.length > 0 && (
              <Card title="From your email" emoji="✉️" action={<button onClick={() => go('inbox')} className="text-sm text-[#5EEAD4] hover:underline">Open inbox</button>}>
                <ul className="space-y-3">
                  {urgent.map((m, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-ink"><b>{m.from}</b> <span className="text-mute">· {relDay(m.date)}</span></p>
                      <p className="text-ink/75">{m.summary}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <Section names={['world']} />
              <Section names={['markets']} />
              <Section names={['tech']} />
              <Section names={['brain']} />
            </div>
            <Section names={['upkeep']} />
          </div>

          <div className="space-y-5">
            <Card title="Coming up" emoji="⏰">
              {upcoming.length === 0
                ? <p className="text-sm text-mute">Nothing due in the next 30 days.</p>
                : <ul className="space-y-2">{upcoming.map((d, i) => {
                    const n = daysUntil(d.date)
                    return (
                      <li key={i} className="text-sm">
                        <p className={n <= 2 ? 'text-[#FBBF24]' : 'text-mute'}>{when(n)}</p>
                        <p className="text-ink/90">{d.note ? <NoteLink id={d.note} onSelect={onSelect}>{d.title}</NoteLink> : d.title}</p>
                      </li>
                    )
                  })}</ul>}
            </Card>
            <Section names={['calendar']} />
            {card && (
              <Card title="Card of the day" emoji="🧠" action={<button onClick={() => go('review')} className="text-sm text-[#5EEAD4] hover:underline">More</button>}>
                <p className="text-ink">What is {card.front}?</p>
                {revealed
                  ? <div className="mt-2 text-sm"><Markdown body={card.back} onSelect={onSelect} /></div>
                  : <button onClick={() => setRevealed(true)} className="action mt-3">Reveal</button>}
              </Card>
            )}
            {feeds.length > 0 && (
              <Card title="Feeds" emoji="📱" action={<button onClick={() => go('feeds')} className="text-sm text-[#5EEAD4] hover:underline">Open</button>}>
                <ul className="space-y-1.5 text-sm">
                  {feeds.map(p => <li key={p.platform + p.from} className="text-ink/90"><b>{p.platform}</b> <span className="text-mute">{Object.entries(p.stats)[0]?.join(': ')}</span></li>)}
                </ul>
              </Card>
            )}
            {recentFiles.length > 0 && (
              <Card title="Recent files" emoji="📁" action={<button onClick={() => go('files')} className="text-sm text-[#5EEAD4] hover:underline">All files</button>}>
                <ul className="space-y-1.5 text-sm">
                  {recentFiles.map(f => <li key={f.path} className="flex gap-2"><span className="min-w-0 flex-1 truncate text-ink/90">{f.name}</span><span className="shrink-0 text-mute">{relDay(f.modified)}</span></li>)}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  )
}
