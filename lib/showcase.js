// Picks what the public site highlights: tour stops, skills and projects. Pure functions.

const summaryOf = (n) =>
  n.meta?.summary ||
  n.body.match(/\*\*In one sentence:\*\*\s*(.+)/)?.[1]?.trim() ||
  n.body.replace(/^#.*$/m, '').split('\n').map(l => l.trim()).find(l => l && !/^(\$\$|[|>#-]|---)/.test(l)) ||
  ''

// Up to `count` stops: projects first, then each topic's hub and best-connected concepts, spread across topics.
export function tourStops(nodes, count = 7) {
  const stops = []
  const add = (n) => { if (n && !stops.some(s => s.id === n.id) && stops.length < count) stops.push({ id: n.id, caption: summaryOf(n) }) }
  const byDegree = [...nodes].sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
  byDegree.filter(n => n.type === 'project').slice(0, 2).forEach(add)
  const topics = [...new Set(byDegree.map(n => n.topic).filter(Boolean))]
  for (let round = 0; stops.length < count && round < 4; round++) {
    for (const t of topics) add(byDegree.filter(n => n.topic === t && n.type !== 'source')[round])
  }
  byDegree.forEach(add)
  return stops
}

// Topics ranked by depth: notes plus the connections inside the topic.
export function skills(nodes, links) {
  const topicOf = Object.fromEntries(nodes.map(n => [n.id, n.topic]))
  const stats = {}
  nodes.forEach(n => { if (n.topic) (stats[n.topic] ??= { topic: n.topic, notes: 0, links: 0 }).notes++ })
  links.forEach(l => {
    const a = topicOf[l.source.id ?? l.source], b = topicOf[l.target.id ?? l.target]
    if (a && a === b) stats[a].links++
  })
  const list = Object.values(stats).map(s => ({ ...s, score: s.notes + s.links / 2 }))
  const max = Math.max(1, ...list.map(s => s.score))
  return list.sort((a, b) => b.score - a.score).map(s => ({ ...s, depth: s.score / max }))
}

export const projects = (nodes) =>
  nodes.filter(n => n.type === 'project')
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))
    .map(n => ({ id: n.id, title: n.title, summary: summaryOf(n), ...n.meta }))
