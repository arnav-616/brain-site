import { useState } from 'react'
import { call } from '../../api'
import { Card, JobStatus, NoteLink, PageTitle } from '../ui'
import { relDay } from '../dates'

const GROUPS = [
  ['action', 'Needs you', 'Waiting on you: reply, confirm or check.'],
  ['school', 'School', 'Classes, assignments and campus.'],
  ['project', 'Projects', 'Work on things you\'re building.'],
  ['opportunity', 'Opportunities', 'Internships, competitions and events.'],
  ['update', 'Updates', 'Worth knowing, nothing to do.'],
]

// Email, sorted into what matters. Filled in by the morning refresh.
export default function InboxPage({ graph, onSelect, job, reload }) {
  const [filter, setFilter] = useState(null)
  const [showHandled, setShowHandled] = useState(false)
  const [error, setError] = useState(null)
  const email = graph.email
  const all = email?.items ?? []
  const handled = all.filter(i => i.handled)
  const items = all.filter(i => !i.handled || showHandled)
  async function setHandled(m, value) {
    try { await call('emailHandled', { url: m.url, handled: value }); reload() } catch (e) { setError(e.message) }
  }

  return (
    <>
      <PageTitle title="Inbox" subtitle={email ? `Sorted from ${email.scanned} emails, ${relDay(email.updated).toLowerCase()}. Newsletters, promos and spam are left out.` : 'Your email, sorted into what matters.'}>
        <button disabled={job.busy} onClick={job.refresh} className="action">Check email now</button>
      </PageTitle>
      <JobStatus job={job} />
      {error && <p className="mb-4 text-sm text-[#F472B6]">{error}</p>}
      {!email ? (
        <Card title="No email pulled yet">
          <p className="text-sm text-mute">Press <b className="text-ink">Check email now</b>. Claude reads your recent Gmail, keeps what matters, and writes notes for people, projects and deadlines. It can draft replies but never sends anything.</p>
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter">
            <button onClick={() => setFilter(null)} className={`chip ${!filter ? 'chip-on' : ''}`} style={{ '--c': '#5EEAD4' }}>All ({items.length})</button>
            {GROUPS.map(([id, label]) => {
              const n = items.filter(i => i.category === id).length
              return n > 0 && <button key={id} onClick={() => setFilter(id)} className={`chip ${filter === id ? 'chip-on' : ''}`} style={{ '--c': '#5EEAD4' }}>{label} ({n})</button>
            })}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {GROUPS.filter(([id]) => !filter || filter === id).map(([id, label, hint]) => {
              const group = items.filter(i => i.category === id)
              if (!group.length) return null
              return (
                <Card key={id} title={label}>
                  <p className="-mt-2 mb-4 text-sm text-mute">{hint}</p>
                  <ul className="divide-y divide-white/5">
                    {group.map((m, i) => (
                      <li key={i} className={`py-3 first:pt-0 last:pb-0 ${m.handled ? 'opacity-50' : ''}`}>
                        <div className="flex items-baseline gap-3">
                          <p className="min-w-0 flex-1 truncate font-medium text-ink">{m.from}</p>
                          <span className="shrink-0 text-xs text-mute">{relDay(m.date)}</span>
                        </div>
                        <p className="text-sm text-ink/80">{m.subject}</p>
                        <p className="mt-1 text-sm text-mute">{m.summary}</p>
                        <p className="mt-2 flex gap-4 text-sm">
                          {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-[#5EEAD4] hover:underline">Open in Gmail</a>}
                          {m.draft && <span className="text-[#FBBF24]">Reply drafted in Gmail</span>}
                          {m.note && <NoteLink id={m.note} onSelect={onSelect}>Related note</NoteLink>}
                          <button onClick={() => setHandled(m, !m.handled)} className="ml-auto text-mute hover:text-ink">{m.handled ? 'Bring back' : 'Mark handled'}</button>
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
          {handled.length > 0 && (
            <button onClick={() => setShowHandled(s => !s)} className="mt-6 text-sm text-mute hover:text-ink">
              {showHandled ? 'Hide' : 'Show'} {handled.length} handled
            </button>
          )}
          {all.some(m => m.draft) && <p className="mt-3 text-sm text-mute">Replies are drafted, never sent. <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer" className="text-[#5EEAD4] hover:underline">Open Gmail drafts</a></p>}
          {email.skipped && <p className="mt-3 text-sm text-mute">Left out: {email.skipped}</p>}
        </>
      )}
    </>
  )
}
