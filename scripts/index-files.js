// Usage: node scripts/index-files.js [--vault <path>]
// Indexes the folders listed in <vault>/.brain/sources.json (default: Desktop, Documents, Downloads)
// into <vault>/.brain/files.json: the most recently changed files, so the dashboard can show and
// search them. Only names, sizes and dates are recorded, never file contents.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { extname, join } from 'node:path'
import { vaultPath } from '../lib/config.js'

const vault = vaultPath()
const home = homedir()
const config = (() => { try { return JSON.parse(readFileSync(join(vault, '.brain/sources.json'), 'utf8')) } catch { return {} } })()
const folders = (config.folders ?? ['~/Desktop', '~/Documents', '~/Downloads']).map(f => f.replace(/^~/, home))
const SKIP = new Set(['node_modules', 'Library', 'Applications', 'dist', 'build', '__pycache__', 'venv', '.venv'])
const MAX_DEPTH = 5, KEEP = 500

const KINDS = {
  doc: ['pdf', 'doc', 'docx', 'pages', 'txt', 'md', 'rtf'], slides: ['ppt', 'pptx', 'key'],
  sheet: ['xls', 'xlsx', 'csv', 'numbers'], image: ['png', 'jpg', 'jpeg', 'heic', 'gif', 'webp', 'svg', 'cr2', 'dng'],
  video: ['mp4', 'mov', 'm4v', 'webm'], audio: ['mp3', 'm4a', 'wav'], archive: ['zip', 'tar', 'gz', 'dmg'],
  code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'ipynb', 'html', 'css', 'json', 'toml', 'yaml', 'yml', 'gradle'],
}
// App data, caches and logs: never something a person opens, so leave them out.
const JUNK = new Set(['dat', 'dat_old', 'log', 'pma', 'db', 'db-journal', 'dylib', 'nbt', 'marker', 'properties', 'history', 'bin', 'tps', 'tds', 'hyper', 'lock', 'tmp', 'cache', 'ds_store', 'crdownload'])
const kindOf = (ext) => Object.keys(KINDS).find(k => KINDS[k].includes(ext)) ?? 'other'

const files = []
function walk(dir, depth) {
  let names
  try { names = readdirSync(dir) } catch { return } // no permission → skip quietly
  for (const name of names) {
    if (name.startsWith('.') || SKIP.has(name) || name.endsWith('.app')) continue
    const full = join(dir, name)
    let st
    try { st = statSync(full) } catch { continue }
    // A folder that's a code project (has .git) is one entry, not thousands of files.
    if (st.isDirectory()) {
      if (existsSync(join(full, '.git'))) files.push({ name, path: full, kind: 'project', size: 0, modified: st.mtime.toISOString() })
      else if (depth < MAX_DEPTH) walk(full, depth + 1)
      continue
    }
    const ext = extname(name).slice(1).toLowerCase()
    if (JUNK.has(ext) || !ext) continue
    files.push({ name, path: full, ext, kind: kindOf(ext), size: st.size, modified: st.mtime.toISOString() })
  }
}
folders.forEach(f => walk(f, 1))

const tilde = (p) => (p.startsWith(home) ? '~' + p.slice(home.length) : p)
const recent = files.sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, KEEP)
  .map(f => ({ ...f, path: tilde(f.path), folder: tilde(folders.find(d => f.path.startsWith(d)) ?? '') }))
const byKind = files.reduce((c, f) => { c[f.kind] = (c[f.kind] || 0) + 1; return c }, {})

writeFileSync(join(vault, '.brain/files.json'), JSON.stringify({
  updated: new Date().toISOString(), folders: folders.map(tilde), total: files.length, byKind, recent,
}, null, 2))
console.log(`✅ files: ${files.length} indexed in ${folders.map(tilde).join(', ')} → .brain/files.json`)
