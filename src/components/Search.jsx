import { useEffect, useRef, useState } from 'react'
import { colorFor } from '../theme'

export default function Search({ nodes, onSelect }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !open && document.activeElement === document.body)) {
        e.preventDefault(); setOpen(true)
      } else if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => { if (open) { setQ(''); setI(0) } }, [open])

  const results = nodes
    .filter(n => n.title.toLowerCase().includes(q.toLowerCase()) || n.tags.some(t => t.includes(q.toLowerCase())))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 8)
  const pick = (n) => { onSelect(n.id); setOpen(false) }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-400 hover:text-white backdrop-blur">
        Search <kbd className="ml-2 text-xs text-slate-500">⌘K</kbd>
      </button>
    )
  }
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 pt-[15vh] px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <input ref={input} autoFocus value={q} placeholder="Search notes or #tags…"
          onChange={e => { setQ(e.target.value); setI(0) }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') setI(x => Math.min(x + 1, results.length - 1))
            if (e.key === 'ArrowUp') setI(x => Math.max(x - 1, 0))
            if (e.key === 'Enter' && results[i]) pick(results[i])
          }}
          className="w-full bg-transparent px-4 py-3 text-white outline-none border-b border-slate-800" />
        <ul className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No matches</li>}
          {results.map((n, j) => (
            <li key={n.id} onClick={() => pick(n)} onMouseEnter={() => setI(j)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm ${j === i ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(n.type) }} />
              {n.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
