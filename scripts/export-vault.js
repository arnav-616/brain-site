// Usage: node scripts/export-vault.js --mode public|private [--vault <path>]
// public  → public/data/graph.json (committed + deployed; leak-checked)
// private → .private/graph.json   (gitignored, only served by `npm run dev:private`)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vaultPath } from '../lib/config.js'
import { parseNote, buildGraph, toPublic, findLeaks } from '../lib/vault.js'
import { unlinkedMentions } from '../lib/life.js'
import { similarPairs } from '../lib/similar.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const mode = arg('mode', 'public')
const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return fallback } }
const vault = vaultPath()
// Archived notes stay in the vault but out of the brain.
const SKIP_DIRS = new Set(['Templates', 'Attachments', 'node_modules', '05-Archive', 'Imports'])
const SKIP_FILES = new Set(['CLAUDE.md'])

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (name.startsWith('.') || SKIP_DIRS.has(name)) return []
    if (statSync(full).isDirectory()) return walk(full)
    return name.endsWith('.md') && !SKIP_FILES.has(name) ? [full] : []
  })
}

const notes = walk(vault).map(f => parseNote(relative(vault, f), readFileSync(f, 'utf8')))
notes.filter(n => n.warning).forEach(n => console.warn(`⚠️  ${n.warning}`))
// Today.md (the morning briefing) is shown in its own panel, not as a node — and only privately.
const briefing = notes.find(n => n.path === 'Today.md')
const graphNotes = notes.filter(n => n !== briefing)

let graph, out
if (mode === 'private') {
  graph = buildGraph(graphNotes)
  // Private extras for the dashboard: where each note lives (for editing), the briefing, and deadlines.
  const pathOf = Object.fromEntries(graphNotes.map(n => [n.id, n.path]))
  const ids = new Set(graphNotes.map(n => n.id))
  graph.nodes.forEach(n => {
    const note = graphNotes.find(x => x.id === n.id)
    Object.assign(n, { path: pathOf[n.id], visibility: note.visibility, missing: note.links.filter(t => !ids.has(t)) })
  })
  graph.briefing = briefing ? { created: briefing.created, body: briefing.body, path: briefing.path } : null
  graph.deadlines = readJson(join(vault, '.brain/deadlines.json'), [])
  graph.email = readJson(join(vault, '.brain/email.json'), null)
  graph.files = readJson(join(vault, '.brain/files.json'), null)
  graph.social = readJson(join(vault, '.brain/social.json'), null)
  graph.state = readJson(join(vault, '.brain/state.json'), {})
  graph.sources = readJson(join(vault, '.brain/sources.json'), {})
  for (const name of ['calendar', 'reminders', 'apple-notes', 'mail-local', 'applications', 'checkins', 'money', 'cards', 'reviews']) {
    graph[name.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = readJson(join(vault, `.brain/${name}.json`), null)
  }
  // Calendar events hidden by the assistant (cancelled, not going) stay out of the dashboard.
  const hidden = readJson(join(vault, '.brain/hidden.json'), { events: [] }).events ?? []
  if (graph.calendar?.items) graph.calendar.items = graph.calendar.items.filter(e => !hidden.some(h => h.title === e.title && h.start === e.start))
  graph.suggestions = unlinkedMentions(graph.nodes)
  graph.similar = similarPairs(graph.nodes.filter(n => !['daily', 'inbox'].includes(n.type)))
  out = join(root, '.private/graph.json')
} else if (mode === 'public') {
  graph = toPublic(graphNotes)
  graph.similar = similarPairs(graph.nodes)
  const leaks = findLeaks(graph, notes)
  if (leaks.length) {
    console.error('❌ Refusing to export — private content found in public data:')
    leaks.forEach(l => console.error(`   - ${l}`))
    process.exit(1)
  }
  out = join(root, 'public/data/graph.json')
} else {
  console.error(`Unknown --mode ${mode} (use public or private)`)
  process.exit(1)
}

graph.generatedAt = new Date().toISOString()
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(graph, null, 2))
const priv = notes.length - graph.nodes.length
console.log(`✅ ${mode}: ${graph.nodes.length} notes, ${graph.links.length} connections → ${relative(root, out)}` +
  (mode === 'public' ? ` (${priv} private notes kept out)` : ''))
