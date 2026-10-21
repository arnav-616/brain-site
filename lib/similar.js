// Which notes mean similar things, from the words they use (TF-IDF + cosine similarity).
// Runs locally at export time: no AI, no cost. Good enough to pull related ideas together.

const STOP = new Set(('a an and are as at be been but by can do does for from has have how i if in into is it its ' +
  'just me more most my no not of on one or our so than that the their them then there these they this to too ' +
  'up us was we were what when which while who why will with you your also very about over only same each other ' +
  'see note notes link links related sources source like make made use used using get got').split(' '))

export function tokens(text) {
  return text.toLowerCase()
    .replace(/^---[\s\S]*?---/, ' ').replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, ' ')
    .replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, ' $1 ').replace(/https?:\/\/\S+/g, ' ')
    .match(/[a-z][a-z0-9-]{2,}/g)?.filter(w => !STOP.has(w)) ?? []
}

// For each note, up to `k` most similar other notes scoring at least `min`: [{ a, b, score }], each pair once.
export function similarPairs(nodes, { k = 3, min = 0.12 } = {}) {
  const docs = nodes.map(n => {
    const tf = {}
    for (const w of tokens(`${n.title} ${n.title} ${n.tags.join(' ')} ${n.body}`)) tf[w] = (tf[w] || 0) + 1
    return tf
  })
  const df = {}
  docs.forEach(d => Object.keys(d).forEach(w => { df[w] = (df[w] || 0) + 1 }))
  const N = docs.length
  const vecs = docs.map(d => {
    const v = {}
    let norm = 0
    for (const [w, c] of Object.entries(d)) { const x = (1 + Math.log(c)) * Math.log((N + 1) / (df[w] + 0.5)); v[w] = x; norm += x * x }
    norm = Math.sqrt(norm) || 1
    for (const w in v) v[w] /= norm
    return v
  })
  const cos = (a, b) => { let s = 0; for (const w in a) if (b[w]) s += a[w] * b[w]; return s }
  const seen = new Set(), out = []
  vecs.forEach((v, i) => {
    vecs.map((u, j) => ({ j, s: i === j ? 0 : cos(v, u) }))
      .filter(x => x.s >= min).sort((x, y) => y.s - x.s).slice(0, k)
      .forEach(({ j, s }) => {
        const key = [nodes[i].id, nodes[j].id].sort().join('\u0000')
        if (seen.has(key)) return
        seen.add(key)
        out.push({ a: nodes[i].id, b: nodes[j].id, score: Math.round(s * 100) / 100 })
      })
  })
  return out
}
