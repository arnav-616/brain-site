// Notes directly linked to `id`, best-connected first.
export function neighborsOf(graph, id) {
  if (!graph || !id) return []
  const end = (e) => e.id ?? e
  const ids = new Set(graph.links.flatMap(l => (end(l.source) === id ? [end(l.target)] : end(l.target) === id ? [end(l.source)] : [])))
  return graph.nodes.filter(n => ids.has(n.id)).sort((a, b) => b.degree - a.degree)
}

// Notes similar in meaning to `id` that aren't already linked to it.
export function similarTo(graph, id) {
  if (!graph?.similar || !id) return []
  const linked = new Set(neighborsOf(graph, id).map(n => n.id))
  const ids = graph.similar.flatMap(p => (p.a === id ? [p.b] : p.b === id ? [p.a] : [])).filter(x => !linked.has(x))
  return ids.map(x => graph.nodes.find(n => n.id === x)).filter(Boolean)
}
