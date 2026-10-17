import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Search from './components/Search'
import Timeline from './components/Timeline'
import Tour from './components/Tour'
import AboutPanel from './components/AboutPanel'
import { linkedTitles } from './links'
import { topicColors } from './theme'
import { tourStops } from '../lib/showcase.js'

// The 3D engine is big; load it separately so the page shows up fast.
const Brain = lazy(() => import('./components/Brain'))
// The note reader pulls in Markdown + KaTeX, so it loads on first open.
const NotePanel = lazy(() => import('./components/NotePanel'))

const PRIVATE = import.meta.env.VITE_GRAPH === 'private'
// Private-only pieces; in the public build PRIVATE is false, so these are dropped entirely.
const Hub = PRIVATE ? lazy(() => import('./components/Hub')) : null
const CommandBar = PRIVATE ? lazy(() => import('./components/CommandBar')) : null
const DATA_URL = PRIVATE ? '/data/graph.private.json' : '/data/graph.json'
const endId = (end) => end.id ?? end
const ago = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso)) / 864e5)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}
const hasWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
})()

// Shareable links: #/note/CAPM opens that note.
const noteFromHash = () => {
  const m = location.hash.match(/^#\/note\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

export default function App() {
  const [graph, setGraph] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(noteFromHash)
  const [topic, setTopic] = useState(null)
  const [dayIndex, setDayIndex] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [panel, setPanel] = useState(() => (PRIVATE && window.innerWidth >= 768 ? 'hub' : null)) // 'hub' | 'about' | null
  const [tourStep, setTourStep] = useState(null)

  // Reload after the dashboard changes the vault, keeping node positions so the brain doesn't jump.
  const load = useCallback(() => fetch(DATA_URL, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Couldn't load the brain data (${DATA_URL}). Run the export, then reload.`))))
    .then(next => setGraph(prev => {
      if (prev) {
        const old = new Map(prev.nodes.map(n => [n.id, n]))
        next.nodes.forEach(n => { const o = old.get(n.id); if (o) Object.assign(n, { x: o.x, y: o.y, z: o.z }) })
      }
      return next
    }))
    .catch(e => setError(e.message)), [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const want = selectedId ? `#/note/${encodeURIComponent(selectedId)}` : ''
    if (location.hash !== want) history.replaceState(null, '', want || location.pathname)
    document.title = selectedId ? `${selectedId} · Arnav's Brain` : "Arnav's Brain"
  }, [selectedId])
  useEffect(() => {
    const onHash = () => setSelectedId(noteFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const topics = useMemo(() => topicColors(graph?.nodes ?? []), [graph])
  const days = useMemo(() => [...new Set(graph?.nodes.map(n => n.created).filter(Boolean))].sort(), [graph])
  const day = days[dayIndex ?? days.length - 1]
  const highlightIds = useMemo(() => (graph?.briefing ? new Set(linkedTitles(graph.briefing.body)) : null), [graph])
  const stops = useMemo(() => (graph ? tourStops(graph.nodes) : []), [graph])

  // Reuse the same node/link objects so the layout keeps its shape while filtering.
  const view = useMemo(() => {
    if (!graph || (!topic && dayIndex === null)) return graph
    const keep = new Set(graph.nodes
      .filter(n => !topic || n.topic === topic)
      .filter(n => dayIndex === null || (n.created ? n.created <= day : dayIndex === days.length - 1))
      .map(n => n.id))
    return {
      nodes: graph.nodes.filter(n => keep.has(n.id)),
      links: graph.links.filter(l => keep.has(endId(l.source)) && keep.has(endId(l.target))),
    }
  }, [graph, topic, dayIndex, day, days.length])

  const touring = tourStep !== null
  const startTour = () => { setPanel(null); setTopic(null); setDayIndex(null); setTourStep(0) }
  const endTour = useCallback(() => { setTourStep(null); setSelectedId(null) }, [])
  const goStep = useCallback((i) => setTourStep(i), [])
  useEffect(() => { if (touring) setSelectedId(stops[tourStep]?.id ?? null) }, [touring, tourStep, stops])

  const selected = graph?.nodes.find(n => n.id === selectedId)

  if (error) return <Message title="The brain didn't load" text={error} />
  if (!graph) return <Message title="Waking up the brain" />
  if (graph.nodes.length === 0) return <Message title="Nothing here yet" text="Notes appear here once they're marked public in the vault." />

  const leftOpen = panel && !touring
  return (
    <>
      {hasWebGL
        ? <Suspense fallback={<Message title="Waking up the brain" />}>
            <Brain data={view} topics={topics} selectedId={selectedId} highlightIds={highlightIds} onSelect={id => { if (!touring) setSelectedId(id) }} />
          </Suspense>
        : <ListFallback graph={graph} topics={topics} onSelect={setSelectedId} />}

      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-4 md:p-7">
        <div className="pointer-events-auto min-w-0 max-w-lg hero-enter">
          <h1 className="font-display text-[1.75rem] md:text-[2.6rem] leading-[1.05] tracking-[-0.01em] text-ink">
            Arnav's Brain
            {PRIVATE && <span className="ml-3 align-middle rounded-full border border-[#F472B6]/40 px-2.5 py-0.5 font-sans text-xs font-semibold text-[#F472B6]">Private</span>}
          </h1>
          {!PRIVATE && (
            <p className="mt-3 hidden text-[15px] leading-relaxed text-ink/80 sm:block">
              Everything I'm learning and building, mapped as one network.
              An AI agent reads my sources and files new notes into it every morning.
            </p>
          )}
          <p className="mt-2 text-sm text-mute">
            {graph.nodes.length} notes and {graph.links.length} connections across {topics.size} topic{topics.size === 1 ? '' : 's'}
            {graph.generatedAt && `. Last grew ${ago(graph.generatedAt)}.`}
          </p>
          {!PRIVATE && !touring && (
            <p className="mt-4 flex flex-wrap gap-2">
              <button onClick={startTour} className="action">Take the tour</button>
              <button onClick={() => setPanel(p => (p === 'about' ? null : 'about'))} className="action action-quiet">About me and my projects</button>
            </p>
          )}
        </div>
        {PRIVATE && (
          <div className="pointer-events-auto order-last w-full md:order-none md:mt-1 md:w-[min(560px,40vw)]">
            <Suspense fallback={null}><CommandBar onChanged={load} onSelect={setSelectedId} /></Suspense>
          </div>
        )}
        <div className="pointer-events-auto shrink-0"><Search nodes={graph.nodes} topics={topics} onSelect={setSelectedId} /></div>
      </header>

      {PRIVATE && !touring && (
        <Suspense fallback={null}>
          <Hub graph={graph} open={panel === 'hub'} onToggle={() => setPanel(p => (p === 'hub' ? null : 'hub'))} onSelect={setSelectedId} onChanged={load} />
        </Suspense>
      )}
      {!PRIVATE && panel === 'about' && !touring && (
        <AboutPanel graph={graph} topics={topics} onSelect={setSelectedId} onClose={() => setPanel(null)} onTour={startTour} />
      )}

      {!touring && (
        <footer className={`pointer-events-none fixed bottom-0 left-0 right-0 z-10 flex flex-col gap-3 p-4 md:p-7 ${selected ? 'md:pr-[500px]' : ''} ${leftOpen ? 'md:pl-[470px]' : ''}`}>
          {topics.size > 0 && (
            <div className="pointer-events-auto flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
              {[...topics].map(([t, color]) => (
                <button key={t} aria-pressed={topic === t}
                  onClick={() => { setTopic(topic === t ? null : t); setSelectedId(null) }}
                  className={`chip ${topic === t ? 'chip-on' : ''}`} style={{ '--c': color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />{t}
                </button>
              ))}
            </div>
          )}
          <div className="pointer-events-auto">
            <Timeline days={days} index={dayIndex ?? days.length - 1} onChange={setDayIndex} playing={playing} onPlay={setPlaying} />
          </div>
        </footer>
      )}

      {touring
        ? <Tour stops={stops} step={tourStep} onStep={goStep} onEnd={endTour} onRead={id => { setTourStep(null); setSelectedId(id) }} />
        : selected && <Suspense fallback={null}><NotePanel note={selected} topics={topics} onSelect={setSelectedId} onClose={() => setSelectedId(null)} /></Suspense>}
    </>
  )
}

function Message({ title, text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="h-3 w-3 animate-ping rounded-full bg-[#5EEAD4]" />
      <h1 className="mt-5 font-display text-xl text-ink">{title}</h1>
      {text && <p className="max-w-sm text-mute">{text}</p>}
    </div>
  )
}

// For devices without WebGL: the same notes as a readable list, grouped by topic.
function ListFallback({ graph, topics, onSelect }) {
  const groups = {}
  graph.nodes.forEach(n => { (groups[n.topic ?? 'other'] ??= []).push(n) })
  return (
    <main className="h-full overflow-y-auto px-4 pb-40 pt-56 md:px-7">
      <p className="mb-6 max-w-lg text-sm text-mute">Your browser can't show the 3D map, so here are the notes as a list.</p>
      {Object.entries(groups).map(([t, notes]) => (
        <section key={t} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold" style={{ color: topics.get(t) ?? '#C7CCF0' }}>{t}</h2>
          <ul className="flex flex-wrap gap-2">
            {notes.map(n => <li key={n.id}><button onClick={() => onSelect(n.id)} className="chip">{n.title}</button></li>)}
          </ul>
        </section>
      ))}
    </main>
  )
}
