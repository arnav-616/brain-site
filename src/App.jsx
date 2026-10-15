import { useEffect, useMemo, useState } from 'react'
import Brain from './components/Brain'
import NotePanel from './components/NotePanel'
import Search from './components/Search'
import Timeline from './components/Timeline'
import TodayPanel from './components/TodayPanel'
import { linkedTitles } from './links'
import { topicColors } from './theme'

const PRIVATE = import.meta.env.VITE_GRAPH === 'private'
const DATA_URL = PRIVATE ? '/data/graph.private.json' : '/data/graph.json'
const endId = (end) => end.id ?? end
const ago = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso)) / 864e5)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

export default function App() {
  const [graph, setGraph] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [topic, setTopic] = useState(null)
  const [dayIndex, setDayIndex] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [todayOpen, setTodayOpen] = useState(() => window.innerWidth >= 768)

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Couldn't load the brain data (${DATA_URL}). Run the export, then reload.`))))
      .then(setGraph)
      .catch(e => setError(e.message))
  }, [])

  const topics = useMemo(() => topicColors(graph?.nodes ?? []), [graph])
  const days = useMemo(() => [...new Set(graph?.nodes.map(n => n.created).filter(Boolean))].sort(), [graph])
  const day = days[dayIndex ?? days.length - 1]
  const highlightIds = useMemo(
    () => (graph?.briefing ? new Set(linkedTitles(graph.briefing.body)) : null), [graph])

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

  const selected = graph?.nodes.find(n => n.id === selectedId)

  if (error) return <Message title="The brain didn't load" text={error} />
  if (!graph) return <Message title="Waking up the brain" />
  if (graph.nodes.length === 0) return <Message title="Nothing here yet" text="Notes appear here once they're marked public in the vault." />

  return (
    <>
      <Brain data={view} topics={topics} selectedId={selectedId} highlightIds={highlightIds} onSelect={setSelectedId} />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 md:p-7">
        <div className="pointer-events-auto min-w-0 max-w-lg hero-enter">
          <h1 className="font-display text-[1.75rem] md:text-[2.6rem] leading-[1.05] tracking-[-0.01em] text-ink">
            Arnav's Brain
            {PRIVATE && <span className="ml-3 align-middle rounded-full border border-[#F472B6]/40 px-2.5 py-0.5 font-sans text-xs font-semibold text-[#F472B6]">Private</span>}
          </h1>
          {!PRIVATE && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink/80 hidden sm:block">
              Everything I'm learning and building, mapped as one network.
              An AI agent reads my sources and files new notes into it every morning.
            </p>
          )}
          <p className="mt-2 text-sm text-mute">
            {graph.nodes.length} notes and {graph.links.length} connections across {topics.size} topic{topics.size === 1 ? '' : 's'}
            {graph.generatedAt && `. Last grew ${ago(graph.generatedAt)}.`}
          </p>
        </div>
        <div className="pointer-events-auto shrink-0"><Search nodes={graph.nodes} topics={topics} onSelect={setSelectedId} /></div>
      </header>

      {PRIVATE && (
        <TodayPanel briefing={graph.briefing} open={todayOpen} onToggle={() => setTodayOpen(o => !o)} onSelect={setSelectedId} />
      )}

      <footer className={`pointer-events-none fixed bottom-0 left-0 right-0 z-10 flex flex-col gap-3 p-4 md:p-7 ${selected ? 'md:pr-[500px]' : ''} ${PRIVATE && todayOpen && graph.briefing ? 'md:pl-[460px]' : ''}`}>
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

      <NotePanel note={selected} topics={topics} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />
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
