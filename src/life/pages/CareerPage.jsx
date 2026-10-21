import { useState } from 'react'
import { call } from '../../api'
import { Card, NoteLink, PageTitle } from '../ui'
import { relDay } from '../dates'

const STAGES = [['saw', 'Saw it'], ['applied', 'Applied'], ['interview', 'Interviewing'], ['offer', 'Offer'], ['closed', 'Closed']]

// Internship tracker: every opening from Saw → Applied → Interview → Offer. Private.
export default function CareerPage({ graph, onSelect, reload }) {
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ company: '', role: '', url: '' })
  const items = graph.applications?.items ?? []

  async function move(item, stage) {
    try { await call('application', { id: item.id, stage }); reload() } catch (e) { setError(e.message) }
  }
  async function add(e) {
    e.preventDefault()
    try { await call('application', { ...form, stage: 'applied' }); setForm({ company: '', role: '', url: '' }); setAdding(false); reload() }
    catch (err) { setError(err.message) }
  }

  return (
    <>
      <PageTitle title="Career" subtitle="Openings you've seen, where each one stands, and what's next. The morning refresh adds new ones from your email.">
        <button onClick={() => setAdding(a => !a)} className="action">{adding ? 'Cancel' : 'Add an application'}</button>
      </PageTitle>
      {error && <p className="mb-4 text-sm text-[#F472B6]">{error}</p>}
      {adding && (
        <Card className="mb-5">
          <form onSubmit={add} className="flex flex-wrap gap-2">
            {[['company', 'Company'], ['role', 'Role'], ['url', 'Link (optional)']].map(([k, ph]) => (
              <input key={k} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} aria-label={ph}
                className="min-w-[160px] flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-ink outline-none placeholder:text-mute focus:border-[#5EEAD4]/50" />
            ))}
            <button type="submit" className="action">Save as applied</button>
          </form>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STAGES.map(([stage, label], si) => {
          const col = items.filter(i => i.stage === stage)
          return (
            <section key={stage} className="glass rounded-3xl p-4">
              <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-ink">{label}<span className="font-normal text-mute">{col.length}</span></h2>
              <ul className="space-y-2">
                {col.map(item => (
                  <li key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                    <p className="font-medium text-ink">{item.company}</p>
                    <p className="text-ink/75">{item.role}</p>
                    <p className="mt-1 text-xs text-mute">{item.source ?? 'Added by you'}{item.updated && `, ${relDay(item.updated).toLowerCase()}`}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {si < STAGES.length - 1 && <button onClick={() => move(item, STAGES[si + 1][0])} className="action px-2 py-1 text-xs">Move to {STAGES[si + 1][1].toLowerCase()}</button>}
                      {si > 0 && <button onClick={() => move(item, STAGES[si - 1][0])} className="action action-quiet px-2 py-1 text-xs">Back</button>}
                      {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="action action-quiet px-2 py-1 text-xs">Open</a>}
                    </div>
                  </li>
                ))}
                {col.length === 0 && <li className="text-xs text-mute">Nothing here.</li>}
              </ul>
            </section>
          )
        })}
      </div>
      <p className="mt-6 text-sm text-mute">Notes on hackathons, projects and opportunities live in <NoteLink id="Career" onSelect={onSelect} />.</p>
    </>
  )
}
