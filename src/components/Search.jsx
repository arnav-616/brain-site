import { useEffect, useRef, useState } from 'react'
import { colorOf } from '../theme'

export default function Search({ nodes, topics, onSelect }) {
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

  // With an empty box, show the notes you opened recently (remembered in this browser only).
  const recent = q ? [] : readRecent().map(id => nodes.find(n => n.id === id)).filter(Boolean)
  const results = q
    ? nodes.filter(n => n.title.toLowerCase().includes(q.toLowerCase()) || n.tags.some(t => t.includes(q.toLowerCase())))
      .sort((a, b) => b.degree - a.degree).slice(0, 8)
    : [...recent, ...[...nodes].sort((a, b) => b.degree - a.degree).filter(n => !recent.includes(n))].slice(0, 8)
  const pick = (n) => { saveRecent(n.id); onSelect(n.id); setOpen(false) }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="glass rounded-full px-4 py-2 text-sm text-mute hover:text-ink">
        Search <kbd className="ml-2 hidden text-xs text-mute sm:inline">⌘K</kbd>
      </button>
    )
  }
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-[#070818]/60 backdrop-blur-sm pt-[15vh] px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md glass rounded-2xl" onClick={e => e.stopPropagation()}>
        <input ref={input} autoFocus value={q} placeholder="Search notes or #tags…"
          onChange={e => { setQ(e.target.value); setI(0) }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') setI(x => Math.min(x + 1, results.length - 1))
            if (e.key === 'ArrowUp') setI(x => Math.max(x - 1, 0))
            if (e.key === 'Enter' && results[i]) pick(results[i])
          }}
          className="w-full bg-transparent px-5 py-4 text-ink outline-none border-b border-white/10 placeholder:text-mute" />
        {!q && recent.length > 0 && <p className="px-4 pt-2 text-xs text-mute">Recently opened</p>}
        <ul className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-mute">No notes match that</li>}
          {results.map((n, j) => (
            <li key={n.id} onClick={() => pick(n)} onMouseEnter={() => setI(j)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm ${j === i ? 'bg-white/8 text-ink' : 'text-ink/75'}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: colorOf(n, topics) }} />
              {n.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const KEY = 'brain.recentNotes'
function readRecent() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? [] } catch { return [] }
}
function saveRecent(id) {
  try { localStorage.setItem(KEY, JSON.stringify([id, ...readRecent().filter(x => x !== id)].slice(0, 5))) } catch { /* storage blocked */ }
}
