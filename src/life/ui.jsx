// Small shared pieces for the Life app pages.

const PATHS = {
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  pulse: 'M3 12h4l3-7 4 14 3-7h4',
  folder: 'M3 6h6l2 2h10v11H3z',
  brain: 'M12 5a3 3 0 0 0-5.8-1A3 3 0 0 0 4 9a3 3 0 0 0 1 5.8A3 3 0 0 0 9 19a3 3 0 0 0 3-1m0-13a3 3 0 0 1 5.8-1A3 3 0 0 1 20 9a3 3 0 0 1-1 5.8A3 3 0 0 1 15 19a3 3 0 0 1-3-1m0-13v13',
  cards: 'M7 4h12v14H7zM4 7v13h12',
  people: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  briefcase: 'M3 8h18v11H3zM8 8V5h8v3M3 13h18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
}

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Card({ title, emoji, action, children, className = '' }) {
  return (
    <section className={`glass rounded-3xl p-5 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center gap-2">
          {title && <h2 className="flex-1 text-[15px] font-semibold text-ink">{emoji && <span className="mr-2">{emoji}</span>}{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[1.9rem] leading-tight text-ink md:text-[2.4rem]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-mute">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function NoteLink({ id, onSelect, children }) {
  return (
    <a onClick={() => onSelect(id)} className="cursor-pointer text-ink underline decoration-white/20 underline-offset-4 hover:decoration-[#5EEAD4]">
      {children ?? id}
    </a>
  )
}

// One status line for running jobs, shown at the top of a page.
export function JobStatus({ job }) {
  const s = job.status
  if (!s) return null
  return (
    <div className="glass mb-5 flex items-start gap-3 rounded-2xl px-5 py-3 text-sm" role="status">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.error ? 'bg-[#F472B6]' : s.done ? 'bg-[#5EEAD4]' : 'animate-pulse bg-[#FBBF24]'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-ink">{s.error ? s.error : s.done ? (s.result && s.result.length < 160 ? s.result : `${s.label}: done.`) : `${s.label}… ${s.step}`}</p>
        {s.done && s.result && s.result.length >= 160 && <p className="mt-1 line-clamp-4 whitespace-pre-line text-mute">{s.result}</p>}
      </div>
      {s.done && <button onClick={job.dismiss} aria-label="Dismiss" className="btn-icon text-lg">×</button>}
    </div>
  )
}
