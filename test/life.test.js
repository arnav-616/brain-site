import { describe, it, expect } from 'vitest'
import { parseCheckin, isCheckin, people, unlinkedMentions, linkFirstMention, perDay } from '../lib/life.js'

describe('parseCheckin', () => {
  it('reads sleep, workouts, mood and steps from plain words', () => {
    expect(parseCheckin('slept 7.5h, gym, mood 4/5, 8000 steps')).toEqual({ sleep: 7.5, workout: true, mood: 4, steps: 8000 })
    expect(parseCheckin('log: studied 3 hours, 6 glasses of water')).toEqual({ study: 3, water: 6 })
  })
  it('ignores impossible moods', () => expect(parseCheckin('mood 9')).toEqual({}))
  it('treats "log …" or two+ measurements as a check-in, ordinary thoughts not', () => {
    expect(isCheckin('log ran today')).toBe(true)
    expect(isCheckin('slept 6h and went to the gym')).toBe(true)
    expect(isCheckin('look into how the gym membership works')).toBe(false)
  })
})

describe('people', () => {
  const nodes = [{ id: 'Priya Shah', path: '03-Areas/People/Priya Shah.md', created: '2026-10-20' }, { id: 'Beta', path: '04-Wiki/Beta.md' }]
  const mail = [
    { from: 'Priya Shah (Example U)', note: 'Priya Shah', category: 'action', date: '2026-10-20' },
    { from: 'Jane Doe', person: true, category: 'action', date: '2026-10-08', handled: true },
    { from: 'Acme Cloud Alerts', category: 'action', date: '2026-10-16' },
    { from: 'LinkedIn job alerts', category: 'opportunity', date: '2026-10-20' },
  ]
  const p = people(nodes, mail)
  it('merges email into People notes and flags who is waiting on you', () => {
    expect(p[0]).toMatchObject({ name: 'Priya Shah', note: 'Priya Shah', waiting: true, last: '2026-10-20' })
  })
  it('skips companies, services and alerts; handled mail is not waiting', () => {
    expect(p.map(x => x.name)).toEqual(['Priya Shah', 'Jane Doe'])
    expect(p[1].waiting).toBe(false)
  })
})

describe('unlinkedMentions', () => {
  const nodes = [
    { id: 'Beta', title: 'Beta', type: 'wiki', body: 'Used in the CAPM. See [[Market Risk Premium]].' },
    { id: 'CAPM', title: 'CAPM', type: 'wiki', body: 'Uses [[Beta]] with $\\beta$ and Market Risk Premium.' },
    { id: 'Market Risk Premium', title: 'Market Risk Premium', type: 'wiki', body: 'x' },
  ]
  it('finds titles mentioned without a link, not ones already linked', () => {
    expect(unlinkedMentions(nodes)).toEqual([{ from: 'Beta', to: 'CAPM' }, { from: 'CAPM', to: 'Market Risk Premium' }])
  })
})

describe('linkFirstMention', () => {
  it('links the first plain mention, keeping its wording, and skips headings, links and math', () => {
    const raw = '---\ntags: [capm]\n---\n# CAPM\nSee [[CAPM]] and $capm$. The capm says, and CAPM again.'
    expect(linkFirstMention(raw, 'CAPM')).toBe('---\ntags: [capm]\n---\n# CAPM\nSee [[CAPM]] and $capm$. The [[CAPM|capm]] says, and CAPM again.')
  })
  it('throws when there is nothing to link', () => {
    expect(() => linkFirstMention('only [[CAPM]]', 'CAPM')).toThrow()
  })
})

describe('perDay', () => {
  it('counts per day over a window, oldest first, including empty days', () => {
    expect(perDay(['2026-10-20T10:00', '2026-10-20', '2026-10-18'], '2026-10-20', 3))
      .toEqual([{ date: '2026-10-18', count: 1 }, { date: '2026-10-19', count: 0 }, { date: '2026-10-20', count: 2 }])
  })
})
