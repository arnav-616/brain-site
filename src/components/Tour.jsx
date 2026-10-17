import { useEffect } from 'react'

const STEP_MS = 7000

// Guided tour: flies through the highlights with one caption each. Arrow keys step, Esc ends.
export default function Tour({ stops, step, onStep, onEnd, onRead }) {
  const stop = stops[step]

  useEffect(() => {
    const id = setTimeout(() => (step < stops.length - 1 ? onStep(step + 1) : onEnd()), STEP_MS)
    return () => clearTimeout(id)
  }, [step, stops.length, onStep, onEnd])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onEnd()
      if (e.key === 'ArrowRight' && step < stops.length - 1) onStep(step + 1)
      if (e.key === 'ArrowLeft' && step > 0) onStep(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, stops.length, onStep, onEnd])

  if (!stop) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-20 flex justify-center px-4">
      <div key={stop.id} className="glass panel-enter pointer-events-auto w-full max-w-lg rounded-3xl px-6 py-5" role="status">
        <div className="mb-3 flex gap-1" aria-hidden>
          {stops.map((s, i) => (
            <span key={s.id} className={`h-0.5 flex-1 rounded-full ${i < step ? 'bg-[#5EEAD4]' : i === step ? 'bg-[#5EEAD4] tour-progress' : 'bg-white/15'}`}
              style={i === step ? { animationDuration: `${STEP_MS}ms` } : undefined} />
          ))}
        </div>
        <h2 className="font-display text-lg text-ink">{stop.id}</h2>
        {stop.caption && <p className="mt-1.5 text-[15px] leading-relaxed text-ink/80">{stop.caption}</p>}
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => onRead(stop.id)} className="action">Read this note</button>
          <button onClick={() => step < stops.length - 1 ? onStep(step + 1) : onEnd()} className="action action-quiet">
            {step < stops.length - 1 ? 'Next' : 'Finish'}
          </button>
          <button onClick={onEnd} className="ml-auto text-sm text-mute hover:text-ink">End tour</button>
        </div>
      </div>
    </div>
  )
}
