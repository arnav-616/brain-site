import { useEffect, useMemo, useState } from 'react'
import { call } from '../../api'
import { timeline } from '../../../lib/timeline.js'
import { Card, NoteLink, PageTitle } from '../ui'
import { relDay } from '../dates'

const KINDS = {
  note: ['Notes', '#A78BFA'], email: ['Email', '#5EEAD4'], file: ['Files', '#7DD3FC'], task: ['Tasks done', '#34D399'],
  capture: ['Captured', '#FBBF24'], health: ['Health', '#F472B6'], event: ['Events', '#FB923C'], media: ['Watched & listened', '#E879F9'],
}

// Your life, day by day: everything the brain saw happen in the last 30 days.
export default function TimelinePage({ graph, onSelect }) {
  const [activity, setActivity] = useState({})
  const [kind, setKind] = useState(null)
  useEffect(() => { call('stats').then(setActivity).catch(() => {}) }, [graph])
  const days = useMemo(() => timeline(graph, activity, { today: new Date().toLocaleDateString('en-CA') }), [graph, activity])
  const shown = days.map(d => ({ ...d, groups: kind ? { [kind]: d.groups[kind] } : d.groups })).filter(d => Object.values(d.groups).some(Boolean))

  return (
    <>
      <PageTitle title="Timeline" subtitle="What happened each day across your notes, email, files, tasks and health." />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Show only">
        <button onClick={() => setKind(null)} className={`chip ${!kind ? 'chip-on' : ''}`} style={{ '--c': '#5EEAD4' }}>Everything</button>
        {Object.entries(KINDS).map(([k, [label, color]]) => (
          <button key={k} onClick={() => setKind(kind === k ? null : k)} className={`chip ${kind === k ? 'chip-on' : ''}`} style={{ '--c': color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}
          </button>
        ))}
      </div>
      {shown.length === 0 && <Card><p className="text-sm text-mute">Nothing in the last 30 days yet.</p></Card>}
      <ol className="relative space-y-5 border-l border-white/10 pl-6">
        {shown.map(d => (
          <li key={d.date} className="relative">
            <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4]" />
            <h2 className="mb-2 text-sm font-semibold text-ink">
              {relDay(d.date)}{' '}
              <span className="font-normal text-mute">{new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </h2>
            <div className="glass space-y-2 rounded-2xl p-4">
              {Object.entries(d.groups).filter(([, list]) => list).map(([k, list]) => (
                <div key={k} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: KINDS[k][1] }} />
                  <p className="min-w-0 text-ink/85">
                    <span className="text-mute">{KINDS[k][0]}: </span>
                    {k === 'task' || k === 'capture'
                      ? `${list.length}`
                      : list.slice(0, 4).map((e, i) => (
                        <span key={i}>{i > 0 && ', '}{e.note ? <NoteLink id={e.note} onSelect={onSelect}>{e.text}</NoteLink> : e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="hover:text-[#5EEAD4]">{e.text}</a> : e.text}</span>
                      ))}
                    {list.length > 4 && k !== 'task' && k !== 'capture' && <span className="text-mute"> and {list.length - 4} more</span>}
                  </p>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
