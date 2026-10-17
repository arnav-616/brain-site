import { describe, it, expect } from 'vitest'
import { tourStops, skills, projects } from '../lib/showcase.js'

const node = (id, extra = {}) => ({ id, title: id, type: 'wiki', tags: [], body: '', degree: 1, topic: null, meta: {}, ...extra })

const nodes = [
  node('Brain Site', { type: 'project', degree: 2, created: '2026-10-13', meta: { repo: 'https://github.com/x/y', summary: 'A 3D map of my notes.' } }),
  node('Beta', { topic: 'finance', degree: 5, body: '**In one sentence:** How much a stock moves vs the market.' }),
  node('CAPM', { topic: 'finance', degree: 4, body: '# CAPM\n\nReturn = rf + beta x MRP' }),
  node('React', { topic: 'webdev', degree: 2 }),
  node('Lecture', { topic: 'finance', type: 'source', degree: 9 }),
]
const links = [{ source: 'Beta', target: 'CAPM' }, { source: 'Brain Site', target: 'React' }]

describe('tourStops', () => {
  const stops = tourStops(nodes, 4)
  it('starts with projects, then spreads across topics', () => {
    expect(stops.map(s => s.id)).toEqual(['Brain Site', 'Beta', 'React', 'CAPM'])
  })
  it('captions with the summary, one-sentence line, or first plain line', () => {
    expect(stops[0].caption).toBe('A 3D map of my notes.')
    expect(stops[1].caption).toBe('How much a stock moves vs the market.')
    expect(stops[3].caption).toBe('Return = rf + beta x MRP')
  })
})

describe('skills', () => {
  it('ranks topics by notes and internal links, deepest = 1', () => {
    const s = skills(nodes, links)
    expect(s[0]).toMatchObject({ topic: 'finance', notes: 3, links: 1, depth: 1 })
    expect(s[1].topic).toBe('webdev')
    expect(s[1].depth).toBeLessThan(1)
  })
})

describe('projects', () => {
  it('lists project notes with their card fields', () => {
    expect(projects(nodes)).toEqual([{ id: 'Brain Site', title: 'Brain Site', summary: 'A 3D map of my notes.', repo: 'https://github.com/x/y' }])
  })
})
