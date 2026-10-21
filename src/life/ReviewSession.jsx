import { useMemo, useState } from 'react'
import Markdown from '../Markdown'
import { call, runJob } from '../api'
import { flashcards, resurface } from '../../lib/insights.js'
import { dueCards, streak } from '../../lib/srs.js'
import { NoteLink } from './ui'

const today = () => new Date().toLocaleDateString('en-CA')
const GRADES = [['again', 'Forgot', 'Back tomorrow'], ['hard', 'Hard', ''], ['good', 'Good', ''], ['easy', 'Easy', '']]

// Spaced review: today's due cards (from concept notes and quizzes you've made), graded with SM-2.
export default function ReviewSession({ graph, onSelect, reload }) {
  const cards = useMemo(() => [
    ...flashcards(graph.nodes, today(), Infinity).map(c => ({ id: `note:${c.id}`, front: `What is ${c.front}?`, back: c.back + (c.formula ? `\n\n$$${c.formula}$$` : ''), note: c.id })),
    ...(graph.cards ?? []),
  ], [graph])
  const reviews = useMemo(() => graph.reviews ?? {}, [graph])
  const queue = useMemo(() => dueCards(cards, reviews, today()), [cards, reviews])
  const [shown, setShown] = useState(false)
  const [quiz, setQuiz] = useState({ note: '', status: null })
  const card = queue[0]
  const days = streak(reviews, today())
  const sources = graph.nodes.filter(n => ['source', 'wiki'].includes(n.type)).sort((a, b) => a.title.localeCompare(b.title))
  const old = resurface(graph.nodes, today())

  async function grade(g) {
    await call('review', { cardId: card.id, grade: g }).catch(() => {})
    setShown(false)
    reload()
  }
  async function makeQuiz() {
    setQuiz(q => ({ ...q, status: 'Writing questions…' }))
    let result = ''
    await runJob('quiz', quiz.note, e => { if (e.type === 'done' || e.type === 'error') result = e.text })
    setQuiz({ note: '', status: result || 'Done.' })
    reload()
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span className="text-ink">{queue.length ? `${queue.length} card${queue.length === 1 ? '' : 's'} to review today` : 'All caught up for today'}</span>
        <span className="text-mute">{days ? `${days}-day streak` : 'Review today to start a streak'}</span>
        <span className="text-mute">{cards.length} cards in total</span>
      </div>

      {card ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[17px] text-ink"><Markdown body={card.front} onSelect={onSelect} /></div>
          {shown ? (
            <>
              <div className="mt-3 border-t border-white/10 pt-3 text-sm"><Markdown body={card.back} onSelect={onSelect} /></div>
              {card.note && <p className="mt-2 text-xs text-mute">From <NoteLink id={card.note} onSelect={onSelect} /></p>}
              <p className="mt-4 text-xs text-mute">How well did you know it?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GRADES.map(([g, label, hint]) => (
                  <button key={g} onClick={() => grade(g)} title={hint} className={`action ${g === 'again' ? 'action-quiet' : ''}`}>{label}</button>
                ))}
              </div>
            </>
          ) : (
            <button onClick={() => setShown(true)} className="action mt-4">Show answer</button>
          )}
        </div>
      ) : (
        <p className="text-sm text-mute">Nothing due. Cards come back on their own schedule: the better you know one, the longer it waits.</p>
      )}

      <section className="mt-7 border-t border-white/10 pt-5">
        <h3 className="text-sm font-semibold text-ink">Make a quiz from a note</h3>
        <p className="mb-3 mt-1 text-sm text-mute">Claude writes 5–8 questions that test understanding, then they join your reviews.</p>
        <div className="flex flex-wrap gap-2">
          <select value={quiz.note} onChange={e => setQuiz({ note: e.target.value, status: null })} aria-label="Note to quiz on"
            className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-[#10122e] px-3 py-2 text-sm text-ink">
            <option value="">Pick a note…</option>
            {sources.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
          <button disabled={!quiz.note || quiz.status === 'Writing questions…'} onClick={makeQuiz} className="action">Make quiz</button>
        </div>
        {quiz.status && <p className="mt-2 text-sm text-mute">{quiz.status}</p>}
      </section>

      {old.length > 0 && (
        <section className="mt-7 border-t border-white/10 pt-5">
          <h3 className="mb-2 text-sm font-semibold text-ink">Worth another look</h3>
          <ul className="space-y-1.5 text-sm">
            {old.map(o => <li key={o.id} className="flex gap-3"><span className="w-28 shrink-0 text-mute">{o.label}</span><NoteLink id={o.id} onSelect={onSelect} /></li>)}
          </ul>
        </section>
      )}
    </>
  )
}
