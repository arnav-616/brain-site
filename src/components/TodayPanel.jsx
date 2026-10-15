import Markdown from '../Markdown'

// The morning briefing (private brain only). Collapses to a pill so the brain stays visible.
export default function TodayPanel({ briefing, open, onToggle, onSelect }) {
  if (!briefing) return null
  const title = briefing.body.match(/^#\s+(.*)$/m)?.[1] ?? 'Today'
  if (!open) {
    return (
      <button onClick={onToggle} className="glass fixed left-4 top-28 z-20 rounded-full px-4 py-2 text-sm text-ink hover:border-[#5EEAD4]/50">
        Open today's briefing
      </button>
    )
  }
  return (
    <aside aria-label="Today's briefing" className="glass panel-enter fixed z-20 overflow-y-auto
      inset-x-0 bottom-0 max-h-[70vh] rounded-t-3xl
      md:left-4 md:right-auto md:top-28 md:bottom-4 md:max-h-none md:w-[420px] md:rounded-3xl">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 pt-5 pb-3 bg-gradient-to-b from-[#0d0f2a] via-[#0d0f2a]/95 to-transparent">
        <h2 className="flex-1 font-display text-base tracking-wide text-ink">{title}</h2>
        <button onClick={onToggle} aria-label="Hide briefing" className="btn-icon">–</button>
      </div>
      <div className="px-6 pb-8 briefing">
        <Markdown body={briefing.body} onSelect={onSelect} />
      </div>
    </aside>
  )
}
