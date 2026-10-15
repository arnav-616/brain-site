import { useEffect } from 'react'

const short = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// Scrub through the days notes were written; "Watch it grow" replays them in order.
export default function Timeline({ days, index, onChange, playing, onPlay }) {
  useEffect(() => {
    if (!playing) return
    if (index >= days.length - 1) { onPlay(false); return }
    const id = setTimeout(() => onChange(index + 1), 650)
    return () => clearTimeout(id)
  }, [playing, index, days.length, onChange, onPlay])

  if (days.length < 2) return null
  return (
    <div className="glass flex items-center gap-3 md:gap-4 rounded-full py-2 pl-2 pr-4 md:pr-5 w-full max-w-xl">
      <button
        onClick={() => { if (!playing && index >= days.length - 1) onChange(0); onPlay(!playing) }}
        className="shrink-0 rounded-full bg-[#5EEAD4]/15 px-4 py-1.5 text-sm font-medium text-[#5EEAD4] hover:bg-[#5EEAD4]/25">
        {playing ? 'Pause' : 'Watch it grow'}
      </button>
      <input
        type="range" min={0} max={days.length - 1} value={index}
        onChange={e => { onPlay(false); onChange(Number(e.target.value)) }}
        aria-label="Show notes written up to this day" className="timeline min-w-0 flex-1"
      />
      <span className="shrink-0 w-14 text-right text-sm tabular-nums text-mute">{short(days[index])}</span>
    </div>
  )
}
