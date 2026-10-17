import { useState } from 'react'
import { call, runJob } from '../api'
import TodayTab from './hub/TodayTab'
import ReviewTab from './hub/ReviewTab'
import HealthTab from './hub/HealthTab'
import PrivacyTab from './hub/PrivacyTab'
import RunsTab from './hub/RunsTab'

const TABS = [['today', 'Today'], ['review', 'Review'], ['health', 'Health'], ['privacy', 'Privacy'], ['runs', 'Runs']]
const JOBS = { ingest: 'Refreshing your briefing', tidy: 'Tidying your inbox' }

// The private morning hub: briefing + review + vault upkeep, with one-click jobs.
export default function Hub({ graph, open, onToggle, onSelect, onChanged }) {
  const [tab, setTab] = useState('today')
  const [job, setJob] = useState(null) // {name, steps, result, error}
  const [note, setNote] = useState(null)

  async function start(name) {
    let steps = []
    setJob({ name, steps })
    await runJob(name, '', (e) => {
      if (e.type === 'tool') steps = [...steps, e.text]
      setJob(j => ({ ...j, steps, ...(e.type === 'done' && { result: e.text, finished: true }), ...(e.type === 'error' && { error: e.text, finished: true }) }))
    })
    setJob(j => ({ ...j, finished: true }))
    onChanged()
  }

  async function undo() {
    if (!window.confirm('Undo the most recent change the dashboard made to your vault?')) return
    try { const { undone } = await call('undo'); setNote(`Undid "${undone}".`); onChanged() }
    catch (e) { setNote(e.message) }
  }

  if (!open) {
    return (
      <button onClick={onToggle} className="glass fixed left-4 top-[8.5rem] z-20 rounded-full px-4 py-2 text-sm text-ink hover:border-[#5EEAD4]/50">
        Open your hub
      </button>
    )
  }
  const running = job && !job.finished
  return (
    <aside aria-label="Your hub" className="glass panel-enter fixed z-20 flex flex-col
      inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl
      md:left-4 md:right-auto md:top-[8.5rem] md:bottom-4 md:max-h-none md:w-[440px] md:rounded-3xl">
      <div className="flex items-center gap-1 border-b border-white/10 px-3 pt-3" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`rounded-t-lg px-3 pb-2.5 pt-1 text-sm transition ${tab === id ? 'text-ink shadow-[inset_0_-2px_0_#5EEAD4]' : 'text-mute hover:text-ink'}`}>
            {label}
          </button>
        ))}
        <button onClick={onToggle} aria-label="Hide hub" className="btn-icon ml-auto pb-2">–</button>
      </div>

      <div className="flex flex-wrap gap-2 px-5 pt-4">
        <button disabled={running} onClick={() => start('ingest')} className="action">Refresh briefing</button>
        <button disabled={running} onClick={() => start('tidy')} className="action">Tidy inbox</button>
        <button disabled={running} onClick={undo} className="action action-quiet">Undo last change</button>
      </div>
      {job && (
        <div className="mx-5 mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm" role="status">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-ink">
              {job.error ? <span className="text-[#F472B6]">{job.error}</span>
                : job.finished ? 'Done.' : <span className="animate-pulse">{JOBS[job.name]}… {job.steps.at(-1) ?? ''}</span>}
            </p>
            {job.finished && <button onClick={() => setJob(null)} aria-label="Dismiss" className="btn-icon text-lg">×</button>}
          </div>
          {job.result && <p className="mt-1 whitespace-pre-line text-mute line-clamp-6">{job.result}</p>}
        </div>
      )}
      {note && <p className="mx-5 mt-3 text-sm text-mute">{note}</p>}

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {tab === 'today' && <TodayTab graph={graph} onSelect={onSelect} onChanged={onChanged} />}
        {tab === 'review' && <ReviewTab graph={graph} onSelect={onSelect} />}
        {tab === 'health' && <HealthTab graph={graph} onSelect={onSelect} />}
        {tab === 'privacy' && <PrivacyTab graph={graph} onSelect={onSelect} onChanged={onChanged} />}
        {tab === 'runs' && <RunsTab key={job?.finished ? 'after' : 'before'} />}
      </div>
    </aside>
  )
}
