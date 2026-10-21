import { Fragment, useState } from 'react'
import HealthTab from '../../components/hub/HealthTab'
import PrivacyTab from '../../components/hub/PrivacyTab'
import RunsTab from '../../components/hub/RunsTab'
import { Card, JobStatus, PageTitle } from '../ui'
import { SOURCES } from '../../../sources/index.js'

const TABS = [['sources', 'Sources'], ['privacy', 'Privacy'], ['health', 'Brain health'], ['runs', 'Run history'], ['keys', 'Shortcuts']]
const KEYS = [['N', 'Capture a thought'], ['⌘K or /', 'Search notes'], ['⌘Enter', 'Ask your brain (in the capture box)'], ['Esc', 'Back to the brain'],
  ['G then B', 'Brain'], ['G then T', 'Briefing'], ['G then I', 'Inbox'], ['G then L', 'Life'], ['G then F', 'Feeds'], ['G then D', 'Files'], ['G then Y', 'Timeline'], ['G then P', 'People'], ['G then C', 'Career'], ['G then R', 'Review'], ['G then S', 'Settings']]

// Where data comes from, what's public, and the vault's upkeep.
export default function SettingsPage({ graph, onSelect, reload, job }) {
  const [tab, setTab] = useState('sources')
  return (
    <>
      <PageTitle title="Settings" subtitle="Where your data comes from, what's public, and how the brain is doing.">
        <div className="flex flex-wrap gap-2">
          <button disabled={job.busy} onClick={job.refresh} className="action">Refresh everything</button>
          <button disabled={job.busy} onClick={job.undo} className="action action-quiet">Undo last change</button>
        </div>
      </PageTitle>
      <JobStatus job={job} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`chip ${tab === id ? 'chip-on' : ''}`} style={{ '--c': '#5EEAD4' }}>{label}</button>
        ))}
      </div>
      <div className="max-w-3xl">
        {tab === 'sources' && (
          <Card>
            <ul className="divide-y divide-white/5">
              {SOURCES.map(src => ({ ...src, ...src.status(graph) })).map(({ id, name, text: status, ok, about, kind }) => (
                <li key={id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ok ? 'bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4]' : 'bg-white/20'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{name} <span className="ml-2 font-normal text-mute">{status}</span></p>
                    <p className="text-sm text-mute">{about} <span className="text-xs">({kind === 'local' ? 'on this Mac' : 'in the morning refresh'})</span></p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {tab === 'privacy' && <Card><PrivacyTab graph={graph} onSelect={onSelect} onChanged={reload} /></Card>}
        {tab === 'health' && <Card><HealthTab graph={graph} onSelect={onSelect} /></Card>}
        {tab === 'runs' && <Card><RunsTab /></Card>}
        {tab === 'keys' && (
          <Card>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              {KEYS.map(([k, what]) => <Fragment key={k}><dt><kbd className="rounded-md bg-white/[0.07] px-2 py-0.5 text-ink">{k}</kbd></dt><dd className="text-ink/80">{what}</dd></Fragment>)}
            </dl>
          </Card>
        )}
      </div>
    </>
  )
}
