import { useEffect, useMemo, useState } from 'react'
import Brain from './components/Brain'
import NotePanel from './components/NotePanel'
import Search from './components/Search'
import { colorFor, TYPE_LABELS } from './theme'

const PRIVATE = import.meta.env.VITE_GRAPH === 'private'
const DATA_URL = PRIVATE ? '/data/graph.private.json' : '/data/graph.json'

export default function App() {
  const [graph, setGraph] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [tag, setTag] = useState(null)

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Couldn't load ${DATA_URL}`))))
      .then(setGraph)
      .catch(e => setError(e.message))
  }, [])

  const tags = useMemo(() => {
    const count = {}
    graph?.nodes.forEach(n => n.tags.forEach(t => { count[t] = (count[t] || 0) + 1 }))
    return Object.entries(count).filter(([t]) => !['daily', 'inbox', 'dashboard'].includes(t))
      .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)
  }, [graph])

  // Keep the same graph object unless the filter changes, so the layout doesn't reset.
  const view = useMemo(() => {
    if (!graph || !tag) return graph
    const keep = new Set(graph.nodes.filter(n => n.tags.includes(tag)).map(n => n.id))
    const id = (end) => end.id ?? end
    return { nodes: graph.nodes.filter(n => keep.has(n.id)), links: graph.links.filter(l => keep.has(id(l.source)) && keep.has(id(l.target))) }
  }, [graph, tag])

  const types = useMemo(() => [...new Set(graph?.nodes.map(n => n.type))], [graph])
  const selected = graph?.nodes.find(n => n.id === selectedId)

  if (error) return <Message title="Something went wrong" text={error} />
  if (!graph) return <Message title="Waking up the brain…" />
  if (graph.nodes.length === 0) return <Message title="Nothing here yet" text="This brain is still growing — check back soon." />

  return (
    <>
      <Brain data={view} selectedId={selectedId} onSelect={setSelectedId} />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 p-4 md:p-6">
        <div className="pointer-events-auto">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Arnav's Brain {PRIVATE && <span className="ml-2 align-middle rounded bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300">PRIVATE</span>}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {graph.nodes.length} notes · {graph.links.length} connections
          </p>
        </div>
        <div className="pointer-events-auto"><Search nodes={graph.nodes} onSelect={setSelectedId} /></div>
      </header>

      <footer className="pointer-events-none fixed bottom-0 left-0 z-10 p-4 md:p-6 space-y-3 max-w-full">
        {tags.length > 0 && (
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {tags.map(t => (
              <button key={t} onClick={() => { setTag(tag === t ? null : t); setSelectedId(null) }}
                className={`rounded-full border px-3 py-1 text-xs backdrop-blur transition ${tag === t ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white'}`}>
                #{t}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {types.map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(t) }} />{TYPE_LABELS[t] || t}
            </span>
          ))}
        </div>
      </footer>

      <NotePanel note={selected} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />
    </>
  )
}

function Message({ title, text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-6">
      <div className="h-3 w-3 animate-ping rounded-full bg-violet-400" />
      <h1 className="mt-4 text-xl font-semibold text-white">{title}</h1>
      {text && <p className="text-slate-400">{text}</p>}
    </div>
  )
}
