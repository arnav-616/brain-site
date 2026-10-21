import { useState } from 'react'
import Markdown from '../Markdown'

// Public "Ask my brain": visitors ask in plain words and get an answer from the public notes, with
// links into the map. Hidden entirely when the server function is off or missing (e.g. local dev).
import site from '../site'

const EXAMPLES = site.askExamples ?? []

export default function AskPanel({ onSelect, onClose }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState(null) // {asking} | {answer} | {error}

  async function ask(question) {
    if (!question.trim()) return
    setState({ asking: true, question })
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) })
      const d = await r.json()
      setState(d.error ? { error: d.error, question } : { answer: d.answer, question })
    } catch { setState({ error: 'Couldn\'t reach the brain. Check your connection.', question }) }
  }

  return (
    <aside aria-label="Ask my brain" className="glass panel-enter fixed z-20 overflow-y-auto
      inset-x-0 bottom-0 max-h-[70vh] rounded-t-3xl p-6
      md:inset-x-auto md:left-4 md:top-4 md:bottom-4 md:max-h-none md:w-[440px] md:rounded-3xl">
      <div className="flex items-start gap-3">
        <h2 className="flex-1 font-display text-xl text-ink">Ask my brain</h2>
        <button onClick={onClose} aria-label="Close" className="btn-icon">×</button>
      </div>
      <p className="mt-2 text-sm text-mute">Answers come only from the notes on this site, with links to them.</p>
      <form onSubmit={e => { e.preventDefault(); ask(q) }} className="mt-4 flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} maxLength={500} placeholder="Ask anything about these notes…" aria-label="Your question"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-ink outline-none placeholder:text-mute focus:border-[#5EEAD4]/50" />
        <button type="submit" disabled={!q.trim() || state?.asking} className="action">Ask</button>
      </form>
      {!state && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map(x => <button key={x} onClick={() => { setQ(x); ask(x) }} className="chip">{x}</button>)}
        </div>
      )}
      {state && (
        <div className="mt-5 text-sm">
          <p className="font-medium text-ink">{state.question}</p>
          {state.asking && <p className="mt-2 animate-pulse text-mute">Thinking…</p>}
          {state.error && <p className="mt-2 text-[#F472B6]">{state.error}</p>}
          {state.answer && <div className="mt-2"><Markdown body={state.answer} onSelect={onSelect} /></div>}
        </div>
      )}
    </aside>
  )
}
