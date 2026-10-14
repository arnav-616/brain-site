// Usage: node scripts/export-vault.js --mode public|private [--vault <path>]
// public  → public/data/graph.json (committed + deployed; leak-checked)
// private → .private/graph.json   (gitignored, only served by `npm run dev:private`)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseNote, buildGraph, toPublic, findLeaks } from '../lib/vault.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const mode = arg('mode', 'public')
const vault = resolve(arg('vault', process.env.VAULT_PATH || join(root, '../second_project')))
const SKIP_DIRS = new Set(['Templates', 'Attachments', 'node_modules'])
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

let graph, out
if (mode === 'private') {
  graph = buildGraph(notes)
  out = join(root, '.private/graph.json')
} else if (mode === 'public') {
  graph = toPublic(notes)
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

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(graph, null, 2))
const priv = notes.length - graph.nodes.length
console.log(`✅ ${mode}: ${graph.nodes.length} notes, ${graph.links.length} connections → ${relative(root, out)}` +
  (mode === 'public' ? ` (${priv} private notes kept out)` : ''))
