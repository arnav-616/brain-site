import { useEffect, useState } from 'react'
import Markdown from '../../Markdown'
import { call } from '../../api'

// History of morning ingests, read from .brain/log/.
export default function RunsTab() {
  const [log, setLog] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { call('runs').then(r => setLog(r.log)).catch(e => setError(e.message)) }, [])

  if (error) return <p className="text-sm text-[#F472B6]">{error}</p>
  if (log === null) return <p className="text-sm text-mute">Loading run history…</p>
  if (!log.trim()) return <p className="text-sm text-mute">No runs yet. Each morning's ingest is logged here: what it pulled in, what changed, and any errors.</p>
  return <Markdown body={log} onSelect={() => {}} />
}
