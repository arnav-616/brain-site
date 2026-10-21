// Pure helpers for the Life features: check-ins, people, link suggestions and weekly stats.

// "slept 7.5h, gym, mood 4/5, 8000 steps, read 30 min" → { sleep: 7.5, workout: true, mood: 4, steps: 8000, ... }
export function parseCheckin(text) {
  const t = text.toLowerCase()
  const num = (re) => { const m = t.match(re); return m ? Number(m[1]) : undefined }
  const out = {
    sleep: num(/(?:slept|sleep)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours)?/),
    mood: num(/mood\s*(\d)(?:\s*\/\s*5)?/),
    steps: num(/(\d{3,6})\s*steps/) ?? num(/steps\s*(\d{3,6})/),
    water: num(/(\d+)\s*(?:glasses|cups)\s*(?:of\s*)?water/),
    workout: /\b(gym|workout|worked out|lifted|ran|run|running|swim|swam|yoga|basketball|soccer|tennis|hike|hiked)\b/.test(t) || undefined,
    study: num(/(?:studied|study)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours)/),
  }
  Object.keys(out).forEach(k => out[k] === undefined && delete out[k])
  if (out.mood !== undefined && (out.mood < 1 || out.mood > 5)) delete out.mood
  return out
}
export const isCheckin = (text) => /^\s*log\b[:\s]/i.test(text) || Object.keys(parseCheckin(text)).length >= 2

// People from People/ notes plus individuals in the email digest (not companies or services),
// with last contact and whether they're waiting on you.
export function people(nodes, emailItems = []) {
  const map = new Map()
  for (const n of nodes) {
    if (!n.path?.startsWith('03-Areas/People/')) continue
    map.set(n.id, { name: n.id, note: n.id, last: n.created, waiting: false, threads: [] })
  }
  for (const m of emailItems) {
    // Only individuals: someone with a People note, or mail the morning run marked as written by a person.
    if (!(m.note && map.has(m.note)) && !m.person) continue
    const key = m.note && map.has(m.note) ? m.note : m.from
    const p = map.get(key) ?? { name: m.from, note: map.has(m.note) ? m.note : null, last: null, waiting: false, threads: [] }
    p.threads.push(m)
    if (!p.last || m.date > p.last) p.last = m.date
    if (m.category === 'action' && !m.handled) p.waiting = true
    map.set(key, p)
  }
  return [...map.values()].sort((a, b) => (b.waiting - a.waiting) || String(b.last ?? '').localeCompare(String(a.last ?? '')))
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Strip things a mention shouldn't be found in: frontmatter, existing [[links]], math, code.
const plain = (body) => body.replace(/^---[\s\S]*?---/, '').replace(/\[\[[^\]]*\]\]/g, ' ').replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, ' ').replace(/`[^`]*`/g, ' ')

// Notes that mention another note's title in plain text without linking it.
export function unlinkedMentions(nodes) {
  const titles = nodes.filter(n => n.title.length >= 4 && !/^\d{4}-\d{2}-\d{2}$/.test(n.title) && !['daily', 'inbox'].includes(n.type))
  const out = []
  for (const n of nodes) {
    if (['daily', 'inbox'].includes(n.type)) continue
    const text = plain(n.body)
    const linked = new Set([...n.body.matchAll(/\[\[([^\]|#]+)/g)].map(m => m[1].split('/').pop().trim()))
    for (const t of titles) {
      if (t.id === n.id || linked.has(t.id)) continue
      if (new RegExp(`(^|[^\\w])${escapeRe(t.title)}(?![\\w])`, 'i').test(text)) out.push({ from: n.id, to: t.id })
    }
  }
  return out
}

// Turn the first plain-text mention of `title` into a [[link]] (outside frontmatter, links, math and code).
export function linkFirstMention(raw, title) {
  const fm = raw.match(/^---[\s\S]*?---\n?/)?.[0] ?? ''
  const body = raw.slice(fm.length)
  const protectedSpans = [...body.matchAll(/\[\[[^\]]*\]\]|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|`[^`]*`|^#.*$/gm)].map(m => [m.index, m.index + m[0].length])
  const re = new RegExp(`(^|[^\\w])(${escapeRe(title)})(?![\\w])`, 'gi')
  for (const m of body.matchAll(re)) {
    const start = m.index + m[1].length
    if (protectedSpans.some(([a, b]) => start >= a && start < b)) continue
    const word = m[2]
    const link = word === title ? `[[${title}]]` : `[[${title}|${word}]]`
    return fm + body.slice(0, start) + link + body.slice(start + word.length)
  }
  throw new Error(`"${title}" isn't mentioned as plain text`)
}

// Daily counts for the last `days` days from dated events: [{ date, count }] oldest first.
export function perDay(dates, today, days = 14) {
  const counts = {}
  dates.forEach(d => { if (d) counts[d.slice(0, 10)] = (counts[d.slice(0, 10)] || 0) + 1 })
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(new Date(today + 'T12:00:00').getTime() - (days - 1 - i) * 864e5).toLocaleDateString('en-CA')
    return { date, count: counts[date] || 0 }
  })
}
