import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import useGraph from '../useGraph'
import { topicColors } from '../theme'
import { linkedTitles } from '../links'
import { Message } from '../components/Message'
import Search from '../components/Search'
import CommandBar from '../components/CommandBar'
import GraphExplorer from '../GraphExplorer'
import { Icon } from './ui'
import useJob from './useJob'
import BrainHome from './BrainHome'
import { neighborsOf, similarTo } from '../neighbors'
import { parseBriefing, parseTasks, section } from '../../lib/briefing.js'
import TodayPage from './pages/TodayPage'
import InboxPage from './pages/InboxPage'
import LifePage from './pages/LifePage'
import FeedsPage from './pages/FeedsPage'
import FilesPage from './pages/FilesPage'
import ReviewPage from './pages/ReviewPage'
import SettingsPage from './pages/SettingsPage'
import PeoplePage from './pages/PeoplePage'
import CareerPage from './pages/CareerPage'
import TimelinePage from './pages/TimelinePage'
import { call } from '../api'
import site from '../site'

const NotePanel = lazy(() => import('../components/NotePanel'))

// The brain is home. Every other section opens as a sheet over it, and any note you open
// closes the sheet and flies the brain to that note.
const PAGES = [
  ['brain', 'Brain', 'brain'], ['today', 'Briefing', 'sun'], ['inbox', 'Inbox', 'mail'], ['people', 'People', 'people'],
  ['career', 'Career', 'briefcase'], ['life', 'Life', 'grid'], ['feeds', 'Feeds', 'pulse'], ['files', 'Files', 'folder'],
  ['timeline', 'Timeline', 'clock'], ['review', 'Review', 'cards'], ['settings', 'Settings', 'gear'],
]
const SHORTCUTS = { b: 'brain', t: 'today', i: 'inbox', p: 'people', c: 'career', l: 'life', f: 'feeds', d: 'files', y: 'timeline', r: 'review', s: 'settings' }
const PHONE_TABS = ['brain', 'today', 'inbox', 'people']
const SHEETS = { timeline: TimelinePage, people: PeoplePage, career: CareerPage, today: TodayPage, inbox: InboxPage, life: LifePage, feeds: FeedsPage, files: FilesPage, review: ReviewPage, settings: SettingsPage }
const pageFromHash = () => {
  const p = location.hash.replace(/^#\//, '')
  return PAGES.some(([id]) => id === p) ? p : 'brain'
}

export default function LifeApp() {
  const { graph, error, reload, offlineSince } = useGraph('/data/graph.private.json')
  // Offline copy on the phone: only over https (Tailscale), where service workers are allowed.
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext && location.hostname !== 'localhost') {
      navigator.serviceWorker.register('/brain-sw.js').catch(() => {})
    }
  }, [])
  const [page, setPage] = useState(pageFromHash)
  const [selectedId, setSelectedId] = useState(null)
  const [more, setMore] = useState(false)
  const [homeOpen, setHomeOpen] = useState(() => window.innerWidth >= 768)
  const [vw, setVw] = useState(window.innerWidth)
  const job = useJob(reload)
  // Live: reload when the data changes (notes edited in Obsidian, email checked, exports read).
  useEffect(() => {
    let last = null
    const id = setInterval(() => call('version').then(({ at }) => { if (last && at !== last) reload(); last = at }).catch(() => {}), 15000)
    return () => clearInterval(id)
  }, [reload])
  // Pick up what the cloud morning run pushed whenever the app opens.
  useEffect(() => { call('sync').then(r => { if (r.pulled) reload() }).catch(() => {}) }, [reload])
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Open tasks for today show in the tab title, like "(3) Arnav's Brain".
  const openTasks = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA')
    return parseTasks(section(parseBriefing(graph?.briefing?.body), 'needs')?.body, today).filter(t => !t.done && !t.overdue && !t.later).length
  }, [graph])
  useEffect(() => {
    if (location.hash !== `#/${page}`) history.replaceState(null, '', `#/${page}`)
    const name = page === 'brain' ? site.title : `${PAGES.find(p => p[0] === page)[1]} · ${site.title}`
    document.title = openTasks ? `(${openTasks}) ${name}` : name
  }, [page, openTasks])
  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    // Shortcuts: Esc → brain, N → capture, G then a letter → a section (see Settings for the list).
    let g = 0
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return
      if (e.key === 'Escape') { setPage('brain'); setSelectedId(null); return }
      if (e.key === 'n') { e.preventDefault(); document.getElementById('capture')?.focus(); return }
      if (e.key === 'g') { g = Date.now(); return }
      if (Date.now() - g < 1200) {
        const target = SHORTCUTS[e.key]
        if (target) { e.preventDefault(); setPage(target); setSelectedId(null) }
        g = 0
      }
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('keydown', onKey) }
  }, [])

  const topics = useMemo(() => topicColors(graph?.nodes ?? []), [graph])
  const highlightIds = useMemo(() => (graph?.briefing ? new Set(linkedTitles(graph.briefing.body)) : null), [graph])
  if (error) return <Message title="The brain didn't load" text={error} />
  if (!graph) return <Message title="Waking up your brain" />

  const selected = graph.nodes.find(n => n.id === selectedId)
  const actionCount = graph.email?.items.filter(i => i.category === 'action' && !i.handled).length ?? 0
  const go = (p) => { setPage(p); if (p !== 'brain') setSelectedId(null) }
  // Opening a note from anywhere brings you back to the brain, flying to it.
  const openNote = (id) => { setPage('brain'); setSelectedId(id) }
  const Sheet = SHEETS[page]
  // Centre the brain in whatever space panels leave free (desktop only).
  const viewShift = vw < 768 ? 0
    : selected ? (240 - 480) / 2
    : Sheet ? (240 + Math.min(920, vw - 280)) / 2
    : homeOpen ? (240 + 400) / 2
    : 120
  const ctx = { graph, topics, onSelect: openNote, reload, job, go }

  return (
    <>
      <GraphExplorer graph={graph} topics={topics} selectedId={selectedId} onSelect={setSelectedId}
        highlightIds={highlightIds} showControls={page === 'brain'} padRight={!!selected} padLeft="md:pl-[260px]" viewShift={viewShift}
        landmark={Sheet ? 'region' : 'main'} />

      {offlineSince && (
        <p role="status" className="fixed inset-x-2 top-2 z-50 rounded-xl bg-[#FBBF24]/15 px-4 py-2 text-center text-sm text-[#FBBF24] backdrop-blur md:left-[264px] md:right-8">
          Offline copy from {new Date(offlineSince).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. Changes are off until your laptop is back.
        </p>
      )}
      {/* Sidebar on desktop, tab bar on phones */}
      <nav aria-label="Sections" className="glass fixed z-40 flex
        inset-x-2 bottom-2 justify-around rounded-2xl px-1 py-1.5
        md:inset-x-auto md:left-4 md:top-4 md:bottom-4 md:w-[220px] md:flex-col md:justify-start md:gap-1 md:rounded-3xl md:p-4">
        {page === 'brain' && <h1 className="sr-only">{site.title}</h1>}
        <button onClick={() => go('brain')} className="mb-5 hidden px-2 pt-1 text-left md:block">
          <p className="font-display text-lg leading-tight text-ink">{site.title}</p>
          <p className="mt-1 text-xs text-mute">{graph.nodes.length} notes, {graph.links.length} connections</p>
        </button>
        {PAGES.map(([id, label, icon]) => (
          <button key={id} onClick={() => { go(id); setMore(false) }} aria-current={page === id ? 'page' : undefined}
            className={`nav-item ${page === id ? 'nav-on' : ''} ${PHONE_TABS.includes(id) ? '' : 'max-md:hidden'}`}>
            <Icon name={icon} />
            <span className="text-[11px] md:text-sm">{label}</span>
            {id === 'inbox' && actionCount > 0 && <span className="badge">{actionCount}</span>}
          </button>
        ))}
        {/* Phones show five tabs; the rest are one tap away under More. */}
        <button onClick={() => setMore(m => !m)} aria-expanded={more} className={`nav-item md:hidden ${more || !PHONE_TABS.includes(page) ? 'nav-on' : ''}`}>
          <Icon name="grid" /><span className="text-[11px]">More</span>
        </button>
      </nav>

      {more && (
        <div className="glass panel-enter fixed inset-x-2 bottom-[4.6rem] z-40 grid grid-cols-3 gap-1 rounded-2xl p-2 md:hidden" role="menu">
          {PAGES.filter(([id]) => !PHONE_TABS.includes(id)).map(([id, label, icon]) => (
            <button key={id} role="menuitem" onClick={() => { go(id); setMore(false) }} className={`nav-item ${page === id ? 'nav-on' : ''}`}>
              <Icon name={icon} /><span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      )}

      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start gap-3 px-4 pt-4 md:pl-[264px] md:pr-8 md:pt-6">
        <div className="pointer-events-auto min-w-0 flex-1 md:max-w-[620px]"><CommandBar onChanged={reload} onSelect={openNote} /></div>
        <div className="pointer-events-auto ml-auto shrink-0"><Search nodes={graph.nodes} topics={topics} onSelect={openNote} /></div>
      </header>

      {page === 'brain' && !selected && <BrainHome {...ctx} open={homeOpen} setOpen={setHomeOpen} />}

      {Sheet && (
        <div className="sheet panel-enter fixed inset-0 z-20 overflow-y-auto md:left-[240px] md:right-auto md:w-[min(920px,calc(100vw-280px))]" key={page}>
          <main className="px-4 pb-28 pt-24 md:px-8 md:pb-12 md:pt-28">
            <button onClick={() => go('brain')} className="mb-4 text-sm text-mute hover:text-ink">← Back to the brain</button>
            <Sheet {...ctx} />
          </main>
        </div>
      )}

      {selected && (
        <Suspense fallback={null}>
          <NotePanel note={selected} topics={topics} onSelect={setSelectedId} onClose={() => setSelectedId(null)} connected={neighborsOf(graph, selected.id)} similar={similarTo(graph, selected.id)}
            extra={<LinkSuggestions note={selected} suggestions={graph.suggestions ?? []} onDone={reload} />} />
        </Suspense>
      )}
    </>
  )
}

// "This note mentions X but doesn't link it" — one click turns the first mention into a [[link]].
function LinkSuggestions({ note, suggestions, onDone }) {
  const [error, setError] = useState(null)
  const mine = suggestions.filter(s => s.from === note.id)
  if (!mine.length || !note.path) return null
  return (
    <section className="mt-6 rounded-2xl border border-[#5EEAD4]/20 bg-[#5EEAD4]/[0.05] p-4">
      <h3 className="text-sm font-semibold text-ink">Mentions you could link</h3>
      <ul className="mt-2 space-y-1.5">
        {mine.map(s => (
          <li key={s.to} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 text-ink/85">{s.to}</span>
            <button onClick={async () => { try { await call('linkMention', { path: note.path, title: s.to }); onDone() } catch (e) { setError(e.message) } }}
              className="action px-2 py-1 text-xs">Link it</button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-[#F472B6]">{error}</p>}
    </section>
  )
}
