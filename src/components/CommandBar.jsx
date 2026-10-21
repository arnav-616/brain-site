import { useEffect, useRef, useState } from 'react'
import Markdown from '../Markdown'
import { call, runJob } from '../api'
import { isCheckin } from '../../lib/life.js'
import { parseActions, describe, gmailDraftUrl } from '../../lib/assist.js'

// Voice input, where the browser supports it (Chrome, Safari).
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition

// Private dashboard: save a thought/link to the inbox (Enter) or ask the brain a question (⌘Enter).
export default function CommandBar({ onChanged, onSelect }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null) // {kind: 'saved'|'error'|'asking'|'answer', text, steps}
  const input = useRef()
  const [listening, setListening] = useState(false)
  const rec = useRef(null)

  function listen() {
    if (listening) { rec.current?.stop(); return }
    const r = new Speech()
    r.lang = 'en-US'; r.interimResults = true
    r.onresult = (e) => setText([...e.results].map(x => x[0].transcript).join(''))
    r.onend = () => { setListening(false); input.current?.focus() }
    r.onerror = () => setListening(false)
    rec.current = r; r.start(); setListening(true)
  }

  async function log() {
    try {
      const { logged } = await call('checkin', { text })
      setText('')
      setStatus({ kind: 'saved', text: `Logged ${Object.entries(logged).map(([k, v]) => (v === true ? k : `${k} ${v}`)).join(', ')}. See it on the Life page.` })
      onChanged()
    } catch (e) { setStatus({ kind: 'error', text: e.message }) }
  }

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
          ref={input} id="capture" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask() } }}
          placeholder={window.innerWidth < 640 ? 'Capture or ask…' : 'Capture a thought or link, or ask your brain…  (N)'}
          aria-label="Capture a thought or link, or ask a question"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-ink outline-none placeholder:text-mute" />
        {Speech && (
          <button type="button" onClick={listen} aria-label={listening ? 'Stop listening' : 'Speak'} title="Speak"
            className={`rounded-xl px-2 py-1.5 ${listening ? 'animate-pulse text-[#F472B6]' : 'text-mute hover:text-ink'}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
        )}
        {isCheckin(text) && (
          <button type="button" onClick={log} title="Log to Health"
            className="rounded-xl bg-[#A78BFA]/15 px-3 py-1.5 text-sm font-medium text-[#C4B5FD] hover:bg-[#A78BFA]/25">Log</button>
        )}
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
                  {status.text && <Answer reply={status.text} done={status.kind === 'answer'} onSelect={onSelect} onApplied={onChanged} />}
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

// The assistant's answer, plus any changes it proposes, each resolved to exactly what it will touch.
// Nothing changes until you press Apply; anything that can't be found (or is ambiguous) is shown and left unticked.
function Answer({ reply, done, onSelect, onApplied }) {
  const { answer, actions, rejected } = parseActions(reply)
  const [preview, setPreview] = useState(null) // [{ok, said, error}] per action
  const [picked, setPicked] = useState([])
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!done || !actions.length) return
    call('previewActions', { actions })
      .then(({ results }) => { setPreview(results); setPicked(results.map(r => r.ok)) })
      .catch(e => setResult({ error: e.message }))
  }, [done, reply]) // eslint-disable-line react-hooks/exhaustive-deps -- re-preview only when the reply changes

  async function apply() {
    const chosen = actions.filter((_, i) => picked[i])
    chosen.filter(a => a.type === 'draft_email').forEach(a => window.open(gmailDraftUrl(a), '_blank'))
    try {
      const { applied } = await call('applyActions', { actions: chosen.filter(a => a.type !== 'draft_email') })
      setResult({ ok: `Done: ${applied + chosen.filter(a => a.type === 'draft_email').length} change${chosen.length === 1 ? '' : 's'}. Undo is in Settings.` })
      onApplied()
    } catch (e) { setResult({ error: e.message }) }
  }

  return (
    <div className="mt-2">
      <Markdown body={answer} onSelect={onSelect} />
      {done && actions.length > 0 && !result?.ok && (
        <div className="mt-3 rounded-xl border border-[#5EEAD4]/25 bg-[#5EEAD4]/[0.05] p-3">
          <p className="mb-2 text-sm font-medium text-ink">Proposed changes</p>
          {!preview && <p className="text-sm text-mute animate-pulse">Checking what each change would touch…</p>}
          {preview && (
            <ul className="space-y-1.5">
              {actions.map((a, i) => (
                <li key={i}>
                  <label className={`flex items-start gap-2 text-sm ${preview[i].ok ? 'text-ink/90' : 'text-mute'}`}>
                    <input type="checkbox" checked={!!picked[i]} disabled={!preview[i].ok}
                      onChange={e => setPicked(p => p.map((v, j) => (j === i ? e.target.checked : v)))} className="mt-1 accent-[#5EEAD4]" />
                    <span>
                      {preview[i].ok ? preview[i].said : describe(a)}
                      {!preview[i].ok && <span className="block text-xs text-[#F472B6]">{preview[i].error}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {rejected.length > 0 && <p className="mt-2 text-xs text-mute">Skipped: {rejected.join('; ')}</p>}
          <button onClick={apply} disabled={!preview || !picked.some(Boolean)} className="action mt-3">Apply</button>
        </div>
      )}
      {result?.ok && <p className="mt-3 text-sm text-[#5EEAD4]">{result.ok}</p>}
      {result?.error && <p className="mt-3 text-sm text-[#F472B6]">{result.error}</p>}
    </div>
  )
}
