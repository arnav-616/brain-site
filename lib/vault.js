// Turns a folder of Obsidian notes into graph data, and filters it down to
// what's safe to publish. Pure functions only — file reading lives in scripts/.
import matter from 'gray-matter'

const LINK_RE = /(!?)\[\[([^\]|#]+)(#[^\]|]*)?(\|[^\]]*)?\]\]/g

const basename = (path) => path.split('/').pop().replace(/\.md$/, '').trim()

export function parseNote(path, raw) {
  const id = basename(path)
  let data = {}, body = raw, warning
  try {
    ;({ data, content: body } = matter(raw))
  } catch {
    warning = `${path}: broken frontmatter, treated as private`
    body = raw.replace(/^---[\s\S]*?\n---\n?/, '')
  }
  const links = []
  for (const [, embed, target] of body.matchAll(LINK_RE)) {
    if (embed) continue
    const t = basename(target)
    if (t && !links.includes(t)) links.push(t)
  }
  return {
    id,
    title: id,
    path,
    type: typeof data.type === 'string' ? data.type : 'note',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    // Anything not explicitly public is private.
    visibility: !warning && data.visibility === 'public' ? 'public' : 'private',
    body: body.trim(),
    links,
    warning,
  }
}

export function buildGraph(notes) {
  const ids = new Set(notes.map(n => n.id))
  const seen = new Set()
  const links = []
  for (const n of notes) {
    for (const t of n.links) {
      if (!ids.has(t) || t === n.id) continue
      const key = [n.id, t].sort().join('\u0000')
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: n.id, target: t })
    }
  }
  const degree = {}
  for (const l of links) {
    degree[l.source] = (degree[l.source] || 0) + 1
    degree[l.target] = (degree[l.target] || 0) + 1
  }
  const nodes = notes.map(({ id, title, type, tags, body }) => ({
    id, title, type, tags, body, degree: degree[id] || 0,
  }))
  return { nodes, links }
}

// Keep only public notes, and strip every link that points anywhere else
// (private notes and not-yet-written notes) so their titles never leak.
export function toPublic(notes) {
  const pub = notes.filter(n => n.visibility === 'public')
  const ok = new Set(pub.map(n => n.id))
  const cleaned = pub.map(n => ({
    ...n,
    links: n.links.filter(t => ok.has(t)),
    body: n.body
      .replace(LINK_RE, (m, embed, target) => (!embed && ok.has(basename(target)) ? m : ''))
      .split('\n')
      .filter(line => !/^\s*[-*]\s*$/.test(line))
      .join('\n')
      .replace(/[ \t]{2,}/g, ' '),
  }))
  return buildGraph(cleaned)
}

// Safety net: report any private title or private text found in public data.
export function findLeaks(publicGraph, allNotes) {
  const haystack = JSON.stringify(publicGraph)
  const leaks = []
  for (const n of allNotes) {
    if (n.visibility === 'public') continue
    if (publicGraph.nodes.some(p => p.id === n.id) || new RegExp(`\\b${escape(n.title)}\\b`).test(haystack)) {
      leaks.push(`private title "${n.title}"`)
    }
    for (const line of n.body.split('\n').map(l => l.trim())) {
      if (line.length >= 20 && haystack.includes(JSON.stringify(line).slice(1, -1))) {
        leaks.push(`text from private note "${n.title}": "${line.slice(0, 40)}…"`)
      }
    }
  }
  return leaks
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
