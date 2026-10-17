import { useMemo, useState } from 'react'
import Markdown from '../../Markdown'
import { flashcards, resurface } from '../../../lib/insights.js'

const today = () => new Date().toLocaleDateString('en-CA')

// Three cards a day to keep concepts fresh, plus older notes worth another look.
export default function ReviewTab({ graph, onSelect }) {
  const cards = useMemo(() => flashcards(graph.nodes, today()), [graph])
  const old = useMemo(() => resurface(graph.nodes, today()), [graph])
  const [shown, setShown] = useState({})

  return (
    <>
      <h3 className="mb-1 text-sm font-semibold text-ink">Today's cards</h3>
      <p className="mb-3 text-sm text-mute">Say the answer in your head, then reveal it.</p>
      {cards.length === 0 && <p className="text-sm text-mute">Cards come from concept notes with an "In one sentence" line. None yet.</p>}
      <ol className="space-y-3">
        {cards.map(c => (
          <li key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-medium text-ink">What is {c.front}?</p>
            {shown[c.id] ? (
              <div className="mt-2 text-sm">
                <Markdown body={c.back + (c.formula ? `\n\n$$${c.formula}$$` : '')} onSelect={onSelect} />
                <button onClick={() => onSelect(c.id)} className="mt-1 text-sm text-[#5EEAD4] hover:underline">Open note</button>
              </div>
            ) : (
              <button onClick={() => setShown(s => ({ ...s, [c.id]: true }))} className="action mt-3">Reveal</button>
            )}
          </li>
        ))}
      </ol>

      <h3 className="mb-2 mt-7 text-sm font-semibold text-ink">Worth another look</h3>
      {old.length === 0 && <p className="text-sm text-mute">Older notes resurface here once your brain is a few weeks old.</p>}
      <ul className="space-y-1.5">
        {old.map(o => (
          <li key={o.id} className="flex items-baseline gap-3 text-sm">
            <span className="w-28 shrink-0 text-mute">{o.label}</span>
            <a onClick={() => onSelect(o.id)} className="cursor-pointer text-ink/90 underline decoration-white/20 underline-offset-4 hover:decoration-[#5EEAD4]">{o.id}</a>
          </li>
        ))}
      </ul>
    </>
  )
}
