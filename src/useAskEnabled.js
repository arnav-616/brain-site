import { useEffect, useState } from 'react'

// Whether the public "Ask my brain" function is switched on (it's off without an API key, and absent in local dev).
export default function useAskEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    fetch('/api/ask').then(r => (r.ok ? r.json() : { enabled: false })).then(d => setEnabled(!!d.enabled)).catch(() => {})
  }, [])
  return enabled
}

