import { useMemo } from 'react'
import { people } from '../../../lib/life.js'
import { Card, NoteLink, PageTitle } from '../ui'
import { relDay } from '../dates'

// Everyone you deal with, from People notes and email: when you last talked and who's waiting on you.
export default function PeoplePage({ graph, onSelect, go }) {
  const list = useMemo(() => people(graph.nodes, graph.email?.items ?? []), [graph])
  const waiting = list.filter(p => p.waiting)

  return (
    <>
      <PageTitle title="People" subtitle="Who you've been in touch with, newest first. People waiting on you are at the top." />
      {waiting.length > 0 && (
        <p className="mb-5 rounded-2xl bg-[#FBBF24]/10 px-4 py-3 text-sm text-[#FBBF24]">
          {waiting.length === 1 ? `${waiting[0].name} is` : `${waiting.length} people are`} waiting on a reply from you.
        </p>
      )}
      {list.length === 0 && <Card><p className="text-sm text-mute">People appear here as the morning refresh reads your email.</p></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map(p => (
          <Card key={p.name}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A78BFA]/15 font-display text-sm text-[#C4B5FD]">
                {p.name.replace(/\(.*\)/, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{p.note ? <NoteLink id={p.note} onSelect={onSelect}>{p.name}</NoteLink> : p.name}</p>
                <p className="text-sm text-mute">
                  {p.last ? `Last in touch ${relDay(p.last).toLowerCase()}` : 'No email yet'}
                  {p.waiting && <span className="ml-2 text-[#FBBF24]">Waiting on you</span>}
                </p>
              </div>
            </div>
            {p.threads.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-white/5 pt-3 text-sm">
                {p.threads.slice(0, 3).map((m, i) => (
                  <li key={i}>
                    <p className="text-ink/85">{m.subject}</p>
                    <p className="text-mute">{m.summary} {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-[#5EEAD4] hover:underline">Open</a>}{m.draft && <span className="ml-2 text-[#FBBF24]">Draft ready</span>}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-mute">Newsletters and job alerts are left out. <button onClick={() => go('inbox')} className="text-[#5EEAD4] hover:underline">See the inbox</button></p>
    </>
  )
}
