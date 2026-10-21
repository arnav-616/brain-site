import { useCallback, useEffect, useState } from 'react'

// Loads the graph data; reload() refetches but keeps node positions so the 3D brain doesn't jump.
export default function useGraph(url) {
  const [graph, setGraph] = useState(null)
  const [error, setError] = useState(null)
  const [offlineSince, setOfflineSince] = useState(null) // set when the phone's offline copy was served
  const reload = useCallback(() => fetch(url, { cache: 'no-store' })
    .then(r => { setOfflineSince(r.headers.get('x-brain-offline')); return r })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Couldn't load the brain data (${url}). Run the export, then reload.`))))
    .then(next => setGraph(prev => {
      if (prev) {
        const old = new Map(prev.nodes.map(n => [n.id, n]))
        next.nodes.forEach(n => { const o = old.get(n.id); if (o) Object.assign(n, { x: o.x, y: o.y, z: o.z }) })
      }
      return next
    }))
    .catch(e => setError(e.message)), [url])
  useEffect(() => { reload() }, [reload])
  return { graph, error, reload, offlineSince }
}
