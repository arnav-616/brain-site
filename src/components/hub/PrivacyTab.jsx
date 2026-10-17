import { useState } from 'react'
import { call } from '../../api'
import { canBePublic } from '../../../lib/insights.js'

// See exactly what's on the public site, and flip notes between public and private.
export default function PrivacyTab({ graph, onSelect, onChanged }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const pub = graph.nodes.filter(n => n.visibility === 'public')
  const priv = graph.nodes.filter(n => n.visibility !== 'public' && canBePublic(n))

  async function flip(n) {
    const to = n.visibility === 'public' ? 'private' : 'public'
    if (to === 'public' && !window.confirm(`Make "${n.title}" public? Only do this if it has no grades, personal life, applications or email in it.`)) return
    setBusy(n.id); setError(null)
    try { await call('visibility', { path: n.path, visibility: to }); onChanged() }
    catch (e) { setError(e.message) }
    setBusy(null)
  }

  const Row = ({ n }) => (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <a onClick={() => onSelect(n.id)} className="min-w-0 flex-1 cursor-pointer truncate text-ink/90 hover:text-ink">{n.title}</a>
      <button disabled={busy === n.id} onClick={() => flip(n)} className="action shrink-0">
        {n.visibility === 'public' ? 'Make private' : 'Make public'}
      </button>
    </li>
  )

  return (
    <>
      <p className="mb-4 text-sm text-mute">
        The public site shows only public notes. Links to private notes are removed, and the export refuses to
        publish if any private title or text slips through. Daily notes, inbox notes and briefings are always private.
      </p>
      {error && <p className="mb-3 text-sm text-[#F472B6]">{error}</p>}
      <h3 className="text-sm font-semibold text-ink">On the public site ({pub.length})</h3>
      <ul className="mb-6 divide-y divide-white/5">{pub.map(n => <Row key={n.id} n={n} />)}</ul>
      <h3 className="text-sm font-semibold text-ink">Private ({priv.length})</h3>
      <ul className="divide-y divide-white/5">{priv.map(n => <Row key={n.id} n={n} />)}</ul>
    </>
  )
}
