import { describe, it, expect } from 'vitest'
import { review, dueCards, streak } from '../lib/srs.js'

describe('review (SM-2)', () => {
  it('spaces cards out further each time you remember them', () => {
    let s = review({}, 'good', '2026-10-20')
    expect([s.interval, s.due]).toEqual([1, '2026-10-21'])
    s = review(s, 'good', '2026-10-21'); expect(s.interval).toBe(3)
    s = review(s, 'good', '2026-10-24'); expect(s.interval).toBeGreaterThanOrEqual(7)
  })
  it('brings a forgotten card back tomorrow and makes it come back more often', () => {
    const s = review(review(review({}, 'good', '2026-10-20'), 'good', '2026-10-21'), 'again', '2026-10-24')
    expect([s.interval, s.reps, s.due]).toEqual([1, 0, '2026-10-25'])
    expect(s.ease).toBeLessThan(2.5)
  })
  it('keeps a history and rejects unknown grades', () => {
    expect(review({}, 'easy', '2026-10-20').history).toEqual([{ date: '2026-10-20', grade: 'easy' }])
    expect(() => review({}, 'meh', '2026-10-20')).toThrow()
  })
})

describe('dueCards', () => {
  const cards = ['a', 'b', 'c', 'd'].map(id => ({ id }))
  it('puts due cards first, then a few new ones, and skips cards not due yet', () => {
    const reviews = { a: { due: '2026-10-20' }, b: { due: '2026-10-25' } }
    expect(dueCards(cards, reviews, '2026-10-20', 1).map(c => c.id)).toEqual(['a', 'c'])
  })
})

describe('streak', () => {
  it('counts consecutive review days up to today or yesterday', () => {
    const r = { a: { history: [{ date: '2026-10-18' }, { date: '2026-10-19' }] }, b: { history: [{ date: '2026-10-20' }, { date: '2026-10-15' }] } }
    expect(streak(r, '2026-10-20')).toBe(3)
    expect(streak(r, '2026-10-21')).toBe(3)
    expect(streak(r, '2026-10-23')).toBe(0)
  })
})
