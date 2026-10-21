import { useState } from 'react'
import { call, runJob } from '../api'

const LABELS = { ingest: 'Refreshing everything', tidy: 'Tidying your inbox' }

// Runs Claude jobs (refresh, tidy) and quick actions (undo, rescan) with one shared status line.
export default function useJob(onChanged) {
  const [status, setStatus] = useState(null) // {label, step, done, error, result}
  const busy = status && !status.done

  async function start(name) {
    setStatus({ label: LABELS[name], step: '' })
    await runJob(name, '', (e) => {
      if (e.type === 'tool') setStatus(s => ({ ...s, step: e.text }))
      if (e.type === 'done') setStatus(s => ({ ...s, done: true, result: e.text }))
      if (e.type === 'error') setStatus(s => ({ ...s, done: true, error: e.text }))
    })
    setStatus(s => ({ ...s, done: true }))
    onChanged()
  }

  async function quick(action, label, body) {
    setStatus({ label, step: '' })
    try {
      const r = await call(action, body)
      setStatus({ label, done: true, result: r.undone ? `Undid "${r.undone}".` : 'Done.' })
      onChanged()
    } catch (e) { setStatus({ label, done: true, error: e.message }) }
  }

  return {
    status, busy,
    refresh: () => start('ingest'),
    tidy: () => start('tidy'),
    rescan: () => quick('rescan', 'Rescanning folders and imports'),
    undo: () => { if (window.confirm('Undo the most recent change the dashboard made to your vault?')) quick('undo', 'Undoing') },
    dismiss: () => setStatus(null),
  }
}
