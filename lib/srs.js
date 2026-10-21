// Spaced repetition (SM-2): each review grade sets when a card comes back.
// again = forgot (back tomorrow), hard / good / easy = remembered with more or less effort.
export const GRADES = { again: 1, hard: 3, good: 4, easy: 5 }

const addDays = (day, n) => new Date(new Date(day + 'T12:00:00').getTime() + n * 864e5).toLocaleDateString('en-CA')

export function review(state = {}, grade, today) {
  const q = GRADES[grade]
  if (!q) throw new Error(`Unknown grade "${grade}"`)
  let { ease = 2.5, interval = 0, reps = 0 } = state
  if (q < 3) { reps = 0; interval = 1 } else {
    reps += 1
    interval = reps === 1 ? 1 : reps === 2 ? (q === 5 ? 4 : 3) : Math.round(interval * ease * (q === 3 ? 0.8 : q === 5 ? 1.3 : 1))
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  return { ease: Math.round(ease * 100) / 100, interval, reps, due: addDays(today, interval), history: [...(state.history ?? []), { date: today, grade }] }
}

// Today's queue: cards that are due, then up to `newPerDay` never-seen cards.
export function dueCards(cards, reviews, today, newPerDay = 5) {
  const due = cards.filter(c => reviews[c.id]?.due && reviews[c.id].due <= today)
  const fresh = cards.filter(c => !reviews[c.id]).slice(0, newPerDay)
  return [...due, ...fresh]
}

// Consecutive days, ending today or yesterday, with at least one review.
export function streak(reviews, today) {
  const days = new Set(Object.values(reviews).flatMap(r => (r.history ?? []).map(h => h.date)))
  let n = 0, d = days.has(today) ? today : addDays(today, -1)
  while (days.has(d)) { n++; d = addDays(d, -1) }
  return n
}
