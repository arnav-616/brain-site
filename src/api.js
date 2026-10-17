// Client for the private dashboard's local API (lib/local-api.js).
const headers = { 'Content-Type': 'application/json', 'X-Brain': '1' }

export async function call(action, body = {}) {
  const r = await fetch(`/api/${action}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await r.json().catch(() => ({ error: `The dashboard API didn't answer (${r.status}). Is this the private dev server?` }))
  if (!r.ok || data.error) throw new Error(data.error || `Request failed (${r.status})`)
  return data
}

// Runs a Claude Code job and calls onEvent({type, text}) for each progress line as it arrives.
export async function runJob(job, text, onEvent) {
  const r = await fetch('/api/run', { method: 'POST', headers, body: JSON.stringify({ job, text }) })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    onEvent({ type: 'error', text: data.error || `Couldn't start (${r.status})` })
    return
  }
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    lines.filter(Boolean).forEach(l => onEvent(JSON.parse(l)))
  }
}
