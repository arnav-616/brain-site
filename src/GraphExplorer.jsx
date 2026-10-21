import { lazy, Suspense, useMemo, useState } from 'react'
import Timeline from './components/Timeline'

// The 3D engine is big; load it separately so the page shows up fast.
const Brain = lazy(() => import('./components/Brain'))

const endId = (end) => end.id ?? end
const hasWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
})()

// The explorable brain: 3D graph + topic filters + timeline. Shared by the public site and the private app.
export default function GraphExplorer({ graph, topics, selectedId, onSelect, highlightIds, showControls = true, padLeft, padRight, viewShift }) {
  const [topic, setTopic] = useState(null)
  const [dayIndex, setDayIndex] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [byMeaning, setByMeaning] = useState(false)
  const days = useMemo(() => [...new Set(graph.nodes.map(n => n.created).filter(Boolean))].sort(), [graph])
  const day = days[dayIndex ?? days.length - 1]

  // Reuse the same node/link objects so the layout keeps its shape while filtering.
  const view = useMemo(() => {
    if (!topic && dayIndex === null) return graph
    const keep = new Set(graph.nodes
      .filter(n => !topic || n.topic === topic)
      .filter(n => dayIndex === null || (n.created ? n.created <= day : dayIndex === days.length - 1))
      .map(n => n.id))
    return { nodes: graph.nodes.filter(n => keep.has(n.id)), links: graph.links.filter(l => keep.has(endId(l.source)) && keep.has(endId(l.target))) }
  }, [graph, topic, dayIndex, day, days.length])

  return (
    <>
      {hasWebGL
        ? <Suspense fallback={null}><Brain data={view} topics={topics} selectedId={selectedId} highlightIds={highlightIds} onSelect={onSelect} viewShift={viewShift}
            similar={graph.similar} byMeaning={byMeaning} /></Suspense>
        : <ListFallback graph={graph} topics={topics} onSelect={onSelect} />}
      {showControls && (
        <footer className={`pointer-events-none fixed bottom-0 left-0 right-0 z-10 flex flex-col gap-3 p-4 md:p-7 ${padRight ? 'md:pr-[500px]' : ''} ${padLeft ?? ''}`}>
          {topics.size > 0 && (
            <div className="pointer-events-auto flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
              {graph.similar?.length > 0 && (
                <button aria-pressed={byMeaning} onClick={() => setByMeaning(m => !m)} title="Pull notes with similar ideas together, even if they aren't linked"
                  className={`chip ${byMeaning ? 'chip-on' : ''}`} style={{ '--c': '#E6E9FF' }}>
                  {byMeaning ? 'Arranged by meaning' : 'Arrange by meaning'}
                </button>
              )}
              {[...topics].map(([t, color]) => (
                <button key={t} aria-pressed={topic === t} onClick={() => { setTopic(topic === t ? null : t); onSelect(null) }}
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
    </>
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
