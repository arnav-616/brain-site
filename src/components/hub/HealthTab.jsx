import { useMemo } from 'react'
import { health } from '../../../lib/insights.js'

const Link = ({ id, onSelect }) => (
  <a onClick={() => onSelect(id)} className="cursor-pointer underline decoration-white/20 underline-offset-4 hover:decoration-[#5EEAD4]">{id}</a>
)

// Weak spots worth fixing. Each section explains what to do about it.
export default function HealthTab({ graph, onSelect }) {
  const h = useMemo(() => health(graph.nodes), [graph])
  const clean = !h.orphans.length && !h.thin.length && !h.wanted.length && !h.noHub.length
  return (
    <div className="space-y-6 text-sm">
      {clean && <p className="text-ink/90">Your brain is in good shape: every note is linked, nothing is thin, and every big topic has a hub.</p>}
      {h.wanted.length > 0 && (
        <section>
          <h3 className="font-semibold text-ink">Notes you've linked to but not written</h3>
          <p className="mb-2 text-mute">The most-linked ones are the most useful to write next.</p>
          <ul className="space-y-1">
            {h.wanted.slice(0, 8).map(w => (
              <li key={w.title} className="text-ink/90">
                <b>{w.title}</b> <span className="text-mute">from {w.from.length} note{w.from.length === 1 ? '' : 's'}: </span>
                {w.from.slice(0, 3).map((f, i) => <span key={f}>{i > 0 && ', '}<Link id={f} onSelect={onSelect} /></span>)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {h.orphans.length > 0 && (
        <section>
          <h3 className="font-semibold text-ink">Unconnected notes</h3>
          <p className="mb-2 text-mute">Nothing links to or from these. Link them to a related concept or hub page.</p>
          <p className="text-ink/90">{h.orphans.map((id, i) => <span key={id}>{i > 0 && ', '}<Link id={id} onSelect={onSelect} /></span>)}</p>
        </section>
      )}
      {h.thin.length > 0 && (
        <section>
          <h3 className="font-semibold text-ink">Thin concept notes</h3>
          <p className="mb-2 text-mute">Under 25 words. Add an example or how it connects to other ideas.</p>
          <p className="text-ink/90">{h.thin.map((id, i) => <span key={id}>{i > 0 && ', '}<Link id={id} onSelect={onSelect} /></span>)}</p>
        </section>
      )}
      {h.noHub.length > 0 && (
        <section>
          <h3 className="font-semibold text-ink">Big topics without a hub page</h3>
          <p className="mb-2 text-mute">Create an area note in 03-Areas/ that links these together.</p>
          <p className="text-ink/90">{h.noHub.map(t => `#${t}`).join(', ')}</p>
        </section>
      )}
    </div>
  )
}
