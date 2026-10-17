// Things the dashboard works out from the graph itself — no AI needed.

const KNOWLEDGE = new Set(['wiki'])
const ALWAYS_PRIVATE = new Set(['daily', 'inbox'])

// Small stable hash so "today's cards" stay the same all day and change tomorrow.
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// Flashcards from concept notes: front = title, back = the "In one sentence" line (+ first formula).
export function flashcards(nodes, day, count = 3) {
  const cards = nodes
    .filter(n => KNOWLEDGE.has(n.type))
    .map(n => {
      const sentence = n.body.match(/\*\*In one sentence:\*\*\s*(.+)/)?.[1]?.trim()
      const formula = n.body.match(/\$\$([\s\S]+?)\$\$/)?.[1]?.trim()
      return sentence ? { id: n.id, front: n.title, back: sentence, formula } : null
    })
    .filter(Boolean)
  return cards.sort((a, b) => hash(day + a.id) - hash(day + b.id)).slice(0, count)
}

const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5)

// Notes from roughly a week / a month / a year ago; falls back to the oldest notes in a young brain.
export function resurface(nodes, day, count = 3) {
  const dated = nodes.filter(n => n.created && !ALWAYS_PRIVATE.has(n.type) && n.created < day)
  const windows = [[7, 'A week ago'], [30, 'A month ago'], [365, 'A year ago']]
  const picks = []
  for (const [d, label] of windows) {
    const hit = dated.find(n => Math.abs(daysBetween(n.created, day) - d) <= Math.ceil(d / 10))
    if (hit) picks.push({ id: hit.id, label })
  }
  for (const n of [...dated].sort((a, b) => a.created.localeCompare(b.created))) {
    if (picks.length >= count) break
    if (!picks.some(p => p.id === n.id)) picks.push({ id: n.id, label: `From ${n.created}` })
  }
  return picks.slice(0, count)
}

// Weak spots in the vault: orphans, thin notes, links to notes that don't exist yet, big topics without a hub.
export function health(nodes) {
  const content = nodes.filter(n => !ALWAYS_PRIVATE.has(n.type) && !n.tags.includes('dashboard'))
  const words = (n) => n.body.replace(/---[\s\S]*?---/, '').split(/\s+/).filter(Boolean).length
  const missing = {}
  content.forEach(n => (n.missing ?? []).forEach(t => { (missing[t] ??= []).push(n.id) }))
  const topicCount = {}
  content.forEach(n => { if (n.topic) topicCount[n.topic] = (topicCount[n.topic] || 0) + 1 })
  const hubs = new Set(nodes.filter(n => n.type === 'area').flatMap(n => n.tags))
  return {
    orphans: content.filter(n => n.degree === 0).map(n => n.id),
    thin: content.filter(n => n.type === 'wiki' && words(n) < 25).map(n => n.id),
    wanted: Object.entries(missing).sort((a, b) => b[1].length - a[1].length).map(([title, from]) => ({ title, from })),
    noHub: Object.entries(topicCount).filter(([t, c]) => c >= 3 && !hubs.has(t)).map(([t]) => t),
  }
}

export const canBePublic = (node) => !ALWAYS_PRIVATE.has(node.type) && !node.tags.includes('briefing')
