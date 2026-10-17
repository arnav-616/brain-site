import { describe, it, expect } from 'vitest'
import { flashcards, resurface, health, canBePublic } from '../lib/insights.js'

const node = (id, extra = {}) => ({ id, title: id, type: 'wiki', tags: [], body: '', degree: 1, created: null, topic: null, ...extra })

describe('flashcards', () => {
  const nodes = [
    node('Beta', { body: '**In one sentence:** How much a stock moves vs the market.\n$$\\beta = x$$' }),
    node('CAPM', { body: '**In one sentence:** Return = rf + beta × MRP.' }),
    node('No Summary', { body: 'just text' }),
    node('Daily', { type: 'daily', body: '**In one sentence:** nope' }),
  ]
  it('only uses concept notes that have a one-sentence summary', () => {
    const ids = flashcards(nodes, '2026-10-16', 10).map(c => c.id).sort()
    expect(ids).toEqual(['Beta', 'CAPM'])
  })
  it('includes the first formula', () => {
    expect(flashcards(nodes, 'x', 10).find(c => c.id === 'Beta').formula).toBe('\\beta = x')
  })
  it('is stable for a given day', () => {
    expect(flashcards(nodes, '2026-10-16', 1)).toEqual(flashcards(nodes, '2026-10-16', 1))
  })
})

describe('resurface', () => {
  it('finds a note from about a week ago, then falls back to the oldest notes', () => {
    const nodes = [node('Old', { created: '2026-10-01' }), node('Week', { created: '2026-10-09' }), node('Today', { created: '2026-10-16' })]
    const picks = resurface(nodes, '2026-10-16')
    expect(picks[0]).toEqual({ id: 'Week', label: 'A week ago' })
    expect(picks.map(p => p.id)).toContain('Old')
    expect(picks.map(p => p.id)).not.toContain('Today')
  })
  it('never resurfaces daily or inbox notes', () => {
    expect(resurface([node('2026-10-09', { type: 'daily', created: '2026-10-09' })], '2026-10-16')).toEqual([])
  })
})

describe('health', () => {
  const nodes = [
    node('Lonely', { degree: 0, body: 'word '.repeat(40) }),
    node('Thin', { body: 'short', missing: ['Risk-Free Rate'] }),
    node('A', { topic: 'finance', body: 'word '.repeat(40), missing: ['Risk-Free Rate', 'Covariance'] }),
    node('B', { topic: 'finance', body: 'word '.repeat(40) }),
    node('C', { topic: 'finance', body: 'word '.repeat(40) }),
    node('2026-10-13', { type: 'daily', degree: 0 }),
  ]
  const h = health(nodes)
  it('lists orphans but ignores daily notes', () => expect(h.orphans).toEqual(['Lonely']))
  it('lists thin concept notes', () => expect(h.thin).toEqual(['Thin']))
  it('ranks wanted notes by how many notes link to them', () => {
    expect(h.wanted[0]).toEqual({ title: 'Risk-Free Rate', from: ['Thin', 'A'] })
  })
  it('flags big topics without a hub page', () => {
    expect(h.noHub).toEqual(['finance'])
    expect(health([...nodes, node('Finance', { type: 'area', tags: ['finance'] })]).noHub).toEqual([])
  })
})

describe('canBePublic', () => {
  it('keeps daily, inbox and briefing notes private', () => {
    expect(canBePublic(node('x', { type: 'daily' }))).toBe(false)
    expect(canBePublic(node('x', { type: 'inbox' }))).toBe(false)
    expect(canBePublic(node('x'))).toBe(true)
  })
})
