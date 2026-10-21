import { describe, it, expect } from 'vitest'
import { timeline } from '../lib/timeline.js'

describe('timeline', () => {
  const graph = {
    nodes: [{ id: 'CAPM', title: 'CAPM', type: 'wiki', created: '2026-10-15' }, { id: '2026-10-20', title: '2026-10-20', type: 'daily', created: '2026-10-20' }],
    email: { items: [{ date: '2026-10-20', from: 'Priya', subject: 'Study Group', url: 'u' }] },
    files: { recent: [{ name: 'a.png', kind: 'image', modified: '2026-10-20T10:00:00Z' }, { name: 'repo', kind: 'project', modified: '2026-10-20T10:00:00Z' }] },
    checkins: { items: [{ date: '2026-10-19', text: 'slept 7h' }] },
  }
  const t = timeline(graph, { tasksDone: ['2026-10-20', '2026-10-20'] }, { today: '2026-10-20', days: 7 })
  it('groups by day, newest first, and skips daily notes and code folders', () => {
    expect(t.map(d => d.date)).toEqual(['2026-10-20', '2026-10-19', '2026-10-15'])
    expect(Object.keys(t[0].groups).sort()).toEqual(['email', 'file', 'task'])
    expect(t[0].groups.task).toHaveLength(2)
  })
  it('leaves out anything older than the window', () => {
    expect(timeline(graph, {}, { today: '2026-10-20', days: 2 }).map(d => d.date)).toEqual(['2026-10-20', '2026-10-19'])
  })
})
