import { describe, it, expect } from 'vitest'
import { parseNote, buildGraph, toPublic, findLeaks } from '../lib/vault.js'

const note = (fm, body) => `---\n${fm}\n---\n${body}`

const files = {
  '04-Wiki/Beta.md': note('type: wiki\ntags: [finance]\nvisibility: public',
    '# Beta\nSee [[CAPM]] and [[Market Risk Premium|MRP]].\nLearned on [[01-Daily/2026-10-13|2026-10-13]].\nApplied at [[Google Internship]].'),
  '04-Wiki/Market Risk Premium.md': note('type: wiki\nvisibility: public', 'Uses [[Beta#Formula]].'),
  '03-Areas/Finance.md': note('type: area\nvisibility: public', '- [[Beta]]\n- [[Market Risk Premium]]'),
  '01-Daily/2026-10-13.md': note('type: daily\nvisibility: private', 'Got a B+ on the finance midterm, learned [[Beta]]'),
  '02-Projects/Google Internship.md': note('type: project\nvisibility: private', 'Interview with recruiter Jane on Friday'),
  '04-Wiki/Unlabeled.md': note('type: wiki', 'No visibility label here [[Beta]]'),
  '04-Wiki/Broken.md': '---\ntype: [oops\n---\nbad frontmatter',
}
const notes = Object.entries(files).map(([p, raw]) => parseNote(p, raw))
const byId = Object.fromEntries(notes.map(n => [n.id, n]))

describe('parseNote', () => {
  it('uses the filename as id/title and reads frontmatter', () => {
    const b = byId['Beta']
    expect(b.title).toBe('Beta')
    expect(b.type).toBe('wiki')
    expect(b.tags).toEqual(['finance'])
    expect(b.visibility).toBe('public')
  })
  it('extracts link targets, handling aliases, headings and folders', () => {
    expect(byId['Beta'].links).toEqual(['CAPM', 'Market Risk Premium', '2026-10-13', 'Google Internship'])
    expect(byId['Market Risk Premium'].links).toEqual(['Beta'])
  })
  it('treats missing visibility as private', () => {
    expect(byId['Unlabeled'].visibility).toBe('private')
  })
  it('treats broken frontmatter as private with a warning instead of throwing', () => {
    expect(byId['Broken'].visibility).toBe('private')
    expect(byId['Broken'].warning).toMatch(/frontmatter/i)
  })
  it('ignores image embeds', () => {
    expect(parseNote('a.md', 'see ![[chart.png]] and [[Real]]').links).toEqual(['Real'])
  })
})

describe('buildGraph', () => {
  const g = buildGraph(notes)
  it('only links notes that exist, without duplicates or self-links', () => {
    const pairs = g.links.map(l => `${l.source}->${l.target}`)
    expect(pairs).toContain('Beta->Market Risk Premium')
    expect(pairs).not.toContain('Beta->CAPM')
    expect(new Set(pairs).size).toBe(pairs.length)
  })
  it('counts connections per node', () => {
    expect(g.nodes.find(n => n.id === 'Beta').degree).toBeGreaterThan(2)
  })
})

describe('toPublic', () => {
  const pub = toPublic(notes)
  const ids = pub.nodes.map(n => n.id).sort()
  it('only includes notes labeled public', () => {
    expect(ids).toEqual(['Beta', 'Finance', 'Market Risk Premium'])
  })
  it('removes links to private and missing notes from the text', () => {
    const body = pub.nodes.find(n => n.id === 'Beta').body
    expect(body).not.toMatch(/Google Internship|2026-10-13|CAPM/)
    expect(body).toContain('[[Market Risk Premium|MRP]]')
  })
  it('only keeps links between public notes', () => {
    for (const l of pub.links) {
      expect(ids).toContain(l.source)
      expect(ids).toContain(l.target)
    }
  })
  it('has no private titles or text anywhere', () => {
    expect(findLeaks(pub, notes)).toEqual([])
  })
})

describe('findLeaks', () => {
  it('does not mistake a created date for a private daily-note title', () => {
    const g = { nodes: [{ id: 'Beta', title: 'Beta', body: 'ok', created: '2026-10-13' }], links: [], generatedAt: '2026-10-13T00:00:00Z' }
    expect(findLeaks(g, notes)).toEqual([])
  })
  it('still catches a daily-note title in the text', () => {
    const g = { nodes: [{ id: 'Beta', title: 'Beta', body: 'see 2026-10-13', created: '2026-10-13' }], links: [] }
    expect(findLeaks(g, notes).join(' ')).toMatch(/2026-10-13/)
  })
  it('catches a private title or text that slipped into public data', () => {
    const bad = { nodes: [{ id: 'X', title: 'X', body: 'about Google Internship: Interview with recruiter Jane on Friday' }], links: [] }
    const leaks = findLeaks(bad, notes)
    expect(leaks.length).toBeGreaterThan(0)
    expect(leaks.join(' ')).toMatch(/Google Internship/)
  })
})

describe('dates and topics', () => {
  it('reads created as a YYYY-MM-DD string, even when YAML parses it as a date', () => {
    expect(parseNote('a.md', note('created: 2026-10-13', 'x')).created).toBe('2026-10-13')
    expect(parseNote('a.md', note("created: '2026-10-14'", 'x')).created).toBe('2026-10-14')
    expect(parseNote('a.md', 'no frontmatter').created).toBeNull()
  })
  it('gives each node a topic from its first meaningful tag', () => {
    const g = buildGraph([
      parseNote('a.md', note('tags: [daily, finance, risk]', 'x')),
      parseNote('b.md', note('tags: [dashboard]', 'x')),
    ])
    expect(g.nodes.find(n => n.id === 'a').topic).toBe('finance')
    expect(g.nodes.find(n => n.id === 'b').topic).toBeNull()
  })
  it('carries created into graph nodes', () => {
    const g = buildGraph([parseNote('a.md', note('created: 2026-10-13', 'x'))])
    expect(g.nodes[0].created).toBe('2026-10-13')
  })
})

describe('project metadata', () => {
  it('keeps string fields for project cards and drops anything else', () => {
    const n = parseNote('p.md', note('type: project\nrepo: https://github.com/a/b\nstack: [React, Three.js]\nstatus: 3\nsecret: x', 'body'))
    expect(n.meta).toEqual({ repo: 'https://github.com/a/b', stack: ['React', 'Three.js'] })
    expect(buildGraph([n]).nodes[0].meta.repo).toBe('https://github.com/a/b')
  })
})
