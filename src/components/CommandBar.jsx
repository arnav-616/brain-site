import { useRef, useState } from 'react'
import Markdown from '../Markdown'
import { call, runJob } from '../api'

// Private dashboard: save a thought/link to the inbox (Enter) or ask the brain a question (⌘Enter).
export default function CommandBar({ onChanged, onSelect }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null) // {kind: 'saved'|'error'|'asking'|'answer', text, steps}
  const input = useRef()

  async function save() {
    if (!text.trim()) return
    try {
      const { title } = await call('capture', { text })
      setText('')
      setStatus({ kind: 'saved', text: `Saved to your inbox as "${title}". It gets filed tomorrow morning, or when you tidy the inbox.` })
      onChanged()
    } catch (e) { setStatus({ kind: 'error', text: e.message }) }
  }

  async function ask() {
    if (!text.trim()) return
    const question = text
    let answer = '', steps = []
    setStatus({ kind: 'asking', question, steps })
    await runJob('ask', question, (e) => {
      if (e.type === 'tool') steps = [...steps, e.text]
      if (e.type === 'text') answer = e.text
      if (e.type === 'done') answer = e.text || answer
      setStatus(e.type === 'error'
        ? { kind: 'error', text: e.text }
        : { kind: e.type === 'done' ? 'answer' : 'asking', question, steps, text: answer })
    })
  }

  return (
    <div className="w-full">
      <form
        onSubmit={e => { e.preventDefault(); save() }}
        className="glass flex items-center gap-2 rounded-2xl p-1.5 pl-4">
        <input
          ref={input} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask() } }}
          placeholder="Capture a thought or link, or ask your brain…"
          aria-label="Capture a thought or link, or ask a question"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-ink outline-none placeholder:text-mute" />
        <button type="submit" disabled={!text.trim()} title="Save to inbox (Enter)"
          className="rounded-xl px-3 py-1.5 text-sm text-ink/90 hover:bg-white/10 disabled:opacity-40">Save</button>
        <button type="button" onClick={ask} disabled={!text.trim() || status?.kind === 'asking'} title="Ask your brain (⌘Enter)"
          className="rounded-xl bg-[#5EEAD4]/15 px-3 py-1.5 text-sm font-medium text-[#5EEAD4] hover:bg-[#5EEAD4]/25 disabled:opacity-40">Ask</button>
      </form>

      {status && (
        <div className="glass panel-enter mt-2 max-h-[55vh] overflow-y-auto rounded-2xl px-5 py-4" role="status">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 text-sm">
              {status.kind === 'saved' && <p className="text-ink/90">{status.text}</p>}
              {status.kind === 'error' && <p className="text-[#F472B6]">{status.text}</p>}
              {(status.kind === 'asking' || status.kind === 'answer') && (
                <>
                  <p className="font-medium text-ink">{status.question}</p>
                  {status.kind === 'asking' && (
                    <p className="mt-2 text-mute animate-pulse">{status.steps.at(-1) ?? 'Thinking'}…</p>
                  )}
                  {status.text && <div className="mt-2"><Markdown body={status.text} onSelect={onSelect} /></div>}
                </>
              )}
            </div>
            <button onClick={() => setStatus(null)} aria-label="Dismiss" className="btn-icon">×</button>
          </div>
        </div>
      )}
    </div>
  )
}
