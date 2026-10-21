import { useState } from 'react'

const GRID = 'rgba(160,170,255,.12)'
const SURFACE = '#10122e'
const label = (date) => new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// One measure per day as small columns: ≤24px wide, 4px rounded tops, hairline baseline, hover tooltip.
export function DailyBars({ title, data, color, unit = '' }) {
  const [hover, setHover] = useState(null)
  const W = 280, H = 84, pad = 2
  const max = Math.max(1, ...data.map(d => d.count))
  const band = W / data.length
  const bw = Math.min(24, band - 2)
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <figure className="relative">
      <figcaption className="mb-2 flex items-baseline gap-2">
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className="text-sm text-mute">{total}{unit} in {data.length} days</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" role="img" aria-label={`${title}: ${total} over the last ${data.length} days`}>
        <line x1="0" x2={W} y1={H + 0.5} y2={H + 0.5} stroke={GRID} strokeWidth="1" />
        {data.map((d, i) => {
          const h = d.count ? Math.max(4, (d.count / max) * (H - pad)) : 0
          const x = i * band + (band - bw) / 2, y = H - h
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * band} y="0" width={band} height={H} fill="transparent" />
              {h > 0 && <path d={`M${x},${H} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${H} Z`} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />}
            </g>
          )
        })}
        <text x="0" y={H + 13} fill="#8A90B8" fontSize="10">{label(data[0].date)}</text>
        <text x={W} y={H + 13} fill="#8A90B8" fontSize="10" textAnchor="end">Today</text>
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-1 right-0 rounded-lg border border-white/10 bg-[#10122e] px-2 py-1 text-xs text-ink">
          {label(data[hover].date)}: {data[hover].count}{unit}
        </div>
      )}
      <table className="sr-only"><tbody>{data.map(d => <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>)}</tbody></table>
    </figure>
  )
}

// A single measure over time as a 2px line with an end dot (surface ring) and the latest value labelled.
export function Sparkline({ title, points, color, min = 0, max, unit = '' }) {
  const [hover, setHover] = useState(null)
  if (points.length === 0) return null
  const W = 280, H = 56
  const hi = max ?? Math.max(...points.map(p => p.value)) * 1.1
  const xs = (i) => (points.length === 1 ? W / 2 : 6 + (i / (points.length - 1)) * (W - 12))
  const ys = (v) => H - 6 - ((v - min) / (hi - min || 1)) * (H - 12)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(p.value)}`).join(' ')
  const last = points[points.length - 1]
  const shown = hover ?? points.length - 1
  return (
    <figure>
      <figcaption className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className="text-sm text-mute">{label(points[shown].date)}: {points[shown].value}{unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}, latest ${last.value}${unit}`}
        onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke={GRID} />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={xs(hover)} x2={xs(hover)} y1="0" y2={H} stroke={GRID} />}
        <circle cx={xs(shown)} cy={ys(points[shown].value)} r="4" fill={color} stroke={SURFACE} strokeWidth="2" />
        {points.map((p, i) => (
          <rect key={i} x={xs(i) - W / points.length / 2} y="0" width={W / points.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <table className="sr-only"><tbody>{points.map(p => <tr key={p.date}><td>{p.date}</td><td>{p.value}</td></tr>)}</tbody></table>
    </figure>
  )
}
