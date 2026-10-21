import { useMemo, useState } from 'react'
import { call } from '../../api'
import { Card, JobStatus, PageTitle } from '../ui'
import { relDay } from '../dates'

const KIND_LABELS = { doc: 'Documents', slides: 'Slides', sheet: 'Sheets', image: 'Images', video: 'Video', audio: 'Audio', code: 'Code', project: 'Code projects', archive: 'Archives', other: 'Other' }
const size = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${Math.round(b / 1e3)} KB` : b ? `${b} B` : '')

// Everything recent across your folders, searchable. Only names and dates are indexed, never contents.
export default function FilesPage({ graph, job }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState(null)
  const [error, setError] = useState(null)
  const idx = graph.files
  const list = useMemo(() => (idx?.recent ?? [])
    .filter(f => !kind || f.kind === kind)
    .filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase()) || f.path.toLowerCase().includes(q.toLowerCase())), [idx, q, kind])

  async function reveal(path) {
    try { await call('reveal', { path }) } catch (e) { setError(e.message) }
  }

  return (
    <>
      <PageTitle title="Files" subtitle={idx ? `${idx.total.toLocaleString()} files in ${idx.folders.join(', ')}. Indexed ${relDay(idx.updated).toLowerCase()}.` : 'Everything recent across your folders.'}>
        <button disabled={job.busy} onClick={job.rescan} className="action">Rescan folders</button>
      </PageTitle>
      <JobStatus job={job} />
      {error && <p className="mb-4 text-sm text-[#F472B6]">{error}</p>}
      {!idx ? (
        <Card title="No folders indexed yet"><p className="text-sm text-mute">Press <b className="text-ink">Rescan folders</b>. Folders are set in <code>.brain/sources.json</code> in your vault.</p></Card>
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by name or folder…" aria-label="Filter files"
              className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-ink outline-none placeholder:text-mute focus:border-[#5EEAD4]/50" />
            <button onClick={() => setKind(null)} className={`chip ${!kind ? 'chip-on' : ''}`} style={{ '--c': '#5EEAD4' }}>All</button>
            {Object.entries(idx.byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <button key={k} onClick={() => setKind(kind === k ? null : k)} className={`chip ${kind === k ? 'chip-on' : ''}`} style={{ '--c': '#5EEAD4' }}>{KIND_LABELS[k] ?? k} ({n})</button>
            ))}
          </div>
          <ul className="divide-y divide-white/5">
            {list.slice(0, 150).map(f => (
              <li key={f.path} className="flex items-center gap-4 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{f.name}</p>
                  <p className="truncate text-xs text-mute">{f.path.slice(0, -f.name.length - 1)}</p>
                </div>
                <span className="hidden w-16 shrink-0 text-right text-xs text-mute sm:block">{size(f.size)}</span>
                <span className="w-24 shrink-0 text-right text-xs text-mute">{relDay(f.modified)}</span>
                <button onClick={() => reveal(f.path)} className="action action-quiet shrink-0">Show</button>
              </li>
            ))}
            {list.length === 0 && <li className="py-6 text-sm text-mute">No files match that.</li>}
          </ul>
        </Card>
      )}
    </>
  )
}
