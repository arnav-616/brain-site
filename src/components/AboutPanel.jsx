import { useMemo } from 'react'
import { skills, projects } from '../../lib/showcase.js'

// Public "About" drawer: what I know (from the graph) and what I've built.
export default function AboutPanel({ graph, topics, onSelect, onClose, onTour }) {
  const skillList = useMemo(() => skills(graph.nodes, graph.links), [graph])
  const projectList = useMemo(() => projects(graph.nodes), [graph])

  return (
    <aside aria-label="About" className="glass panel-enter fixed z-20 overflow-y-auto
      inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl
      md:left-4 md:right-auto md:top-4 md:bottom-4 md:max-h-none md:w-[440px] md:rounded-3xl">
      <div className="flex items-start gap-3 px-6 pt-6">
        <h2 className="flex-1 font-display text-xl text-ink">About this brain</h2>
        <button onClick={onClose} aria-label="Close" className="btn-icon">×</button>
      </div>
      <div className="px-6 pb-10">
        <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
          I'm Arnav. This is my second brain: every concept I learn and project I build is a note, and every link
          between them is a line. Each morning an AI agent I built reads my sources, writes new notes in my words, links
          them, and republishes this map. Private notes never leave my laptop.
        </p>
        <button onClick={onTour} className="action mt-4">Take the 60-second tour</button>

        {projectList.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-ink">Things I've built</h3>
            <ul className="space-y-3">
              {projectList.map(p => (
                <li key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  {p.image && <img src={p.image} alt="" className="mb-3 aspect-video w-full rounded-xl object-cover" loading="lazy" />}
                  <button onClick={() => onSelect(p.id)} className="text-left font-medium text-ink hover:text-[#5EEAD4]">{p.title}</button>
                  {p.summary && <p className="mt-1 text-sm text-ink/75">{p.summary}</p>}
                  {Array.isArray(p.stack) && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {p.stack.map(s => <span key={s} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-mute">{s}</span>)}
                    </p>
                  )}
                  <p className="mt-3 flex gap-4 text-sm">
                    {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-[#5EEAD4] hover:underline">Open it</a>}
                    {p.repo && <a href={p.repo} target="_blank" rel="noreferrer" className="text-[#5EEAD4] hover:underline">See the code</a>}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {skillList.length > 0 && (
          <section className="mt-8">
            <h3 className="text-sm font-semibold text-ink">What I know, by depth</h3>
            <p className="mb-3 mt-1 text-sm text-mute">Measured from the map: notes in each topic plus the links between them.</p>
            <ul className="space-y-3">
              {skillList.map(s => (
                <li key={s.topic}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink">{s.topic}</span>
                    <span className="text-mute">{s.notes} notes, {s.links} links</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/[0.06]">
                    <div className="h-1 rounded-full" style={{ width: `${Math.max(6, s.depth * 100)}%`, background: topics.get(s.topic), boxShadow: `0 0 10px ${topics.get(s.topic)}` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}
