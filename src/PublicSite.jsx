import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import GraphExplorer from './GraphExplorer'
import Search from './components/Search'
import Tour from './components/Tour'
import AboutPanel from './components/AboutPanel'
import AskPanel from './components/AskPanel'
import useAskEnabled from './useAskEnabled'
import site from './site'
import { Message } from './components/Message'
import useGraph from './useGraph'
import { topicColors } from './theme'
import { tourStops } from '../lib/showcase.js'
import { neighborsOf, similarTo } from './neighbors'

// The note reader pulls in Markdown + KaTeX, so it loads on first open.
const NotePanel = lazy(() => import('./components/NotePanel'))

const ago = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso)) / 864e5)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}
// Shareable links: #/note/CAPM opens that note.
const noteFromHash = () => {
  const m = location.hash.match(/^#\/note\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

// The public, recruiter-facing brain.
export default function PublicSite() {
  const { graph, error } = useGraph('/data/graph.json')
  const [selectedId, setSelectedId] = useState(noteFromHash)
  const [about, setAbout] = useState(false) // false | 'about' | 'ask'
  const askEnabled = useAskEnabled()
  const [tourStep, setTourStep] = useState(null)

  useEffect(() => {
    const want = selectedId ? `#/note/${encodeURIComponent(selectedId)}` : ''
    if (location.hash !== want) history.replaceState(null, '', want || location.pathname)
    document.title = selectedId ? `${selectedId} · ${site.title}` : site.title
  }, [selectedId])
  useEffect(() => {
    const onHash = () => setSelectedId(noteFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const topics = useMemo(() => topicColors(graph?.nodes ?? []), [graph])
  const stops = useMemo(() => (graph ? tourStops(graph.nodes) : []), [graph])
  const touring = tourStep !== null
  const startTour = () => { setAbout(false); setTourStep(0) }
  const endTour = useCallback(() => { setTourStep(null); setSelectedId(null) }, [])
  const goStep = useCallback((i) => setTourStep(i), [])
  useEffect(() => { if (touring) setSelectedId(stops[tourStep]?.id ?? null) }, [touring, tourStep, stops])

  if (error) return <Message title="The brain didn't load" text={error} />
  if (!graph) return <Message title="Waking up the brain" />
  if (graph.nodes.length === 0) return <Message title="Nothing here yet" text="Notes appear here once they're marked public in the vault." />
  const selected = graph.nodes.find(n => n.id === selectedId)
  const weekAgo = new Date(Date.now() - 7 * 864e5).toLocaleDateString('en-CA')
  const newThisWeek = graph.nodes.filter(n => n.created && n.created >= weekAgo).sort((a, b) => b.created.localeCompare(a.created))

  return (
    <>
      <GraphExplorer graph={graph} topics={topics} selectedId={selectedId} onSelect={id => { if (!touring) setSelectedId(id) }}
        showControls={!touring} padRight={!!selected} padLeft={about ? 'md:pl-[470px]' : ''}
        viewShift={window.innerWidth < 768 ? 0 : selected && !touring ? -240 : about ? 230 : 0} />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between gap-6 p-4 md:p-7">
        <div className="pointer-events-auto min-w-0 max-w-lg hero-enter">
          <h1 className="font-display text-[1.75rem] md:text-[2.6rem] leading-[1.05] tracking-[-0.01em] text-ink">{site.title}</h1>
          <p className="mt-3 hidden text-[15px] leading-relaxed text-ink/80 sm:block">
              {site.tagline}
          </p>
          <p className="mt-2 text-sm text-mute">
            {graph.nodes.length} notes and {graph.links.length} connections across {topics.size} topic{topics.size === 1 ? '' : 's'}
            {graph.generatedAt && `. Last grew ${ago(graph.generatedAt)}.`}
          </p>
          {newThisWeek.length > 0 && (
            <p className="mt-1 hidden text-sm text-mute sm:block">
              New this week:{' '}
              {newThisWeek.slice(0, 3).map((n, i) => <span key={n.id}>{i > 0 && ', '}<button onClick={() => setSelectedId(n.id)} className="text-ink/85 underline decoration-white/20 underline-offset-4 hover:decoration-[#5EEAD4]">{n.title}</button></span>)}
              {newThisWeek.length > 3 && ` and ${newThisWeek.length - 3} more`}
            </p>
          )}
          {!touring && (
            <p className="mt-4 flex flex-wrap gap-2">
              <button onClick={startTour} className="action">Take the tour</button>
              <button onClick={() => setAbout(a => (a === 'about' ? false : 'about'))} className="action action-quiet">About me and my projects</button>
              {askEnabled && <button onClick={() => setAbout(a => (a === 'ask' ? false : 'ask'))} className="action action-quiet">Ask my brain</button>}
            </p>
          )}
        </div>
        <div className="pointer-events-auto shrink-0"><Search nodes={graph.nodes} topics={topics} onSelect={setSelectedId} /></div>
      </header>

      {about === 'about' && !touring && <AboutPanel graph={graph} topics={topics} onSelect={setSelectedId} onClose={() => setAbout(false)} onTour={startTour} />}
      {about === 'ask' && !touring && <AskPanel onSelect={setSelectedId} onClose={() => setAbout(false)} />}
      {touring
        ? <Tour stops={stops} step={tourStep} onStep={goStep} onEnd={endTour} onRead={id => { setTourStep(null); setSelectedId(id) }} />
        : selected && <Suspense fallback={null}><NotePanel note={selected} topics={topics} onSelect={setSelectedId} onClose={() => setSelectedId(null)} connected={neighborsOf(graph, selected.id)} similar={similarTo(graph, selected.id)} /></Suspense>}
    </>
  )
}
