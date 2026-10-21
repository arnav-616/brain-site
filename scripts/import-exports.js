// Usage: node scripts/import-exports.js [--vault <path>]
// Reads every "Download your data" export in <vault>/Imports/ (folders, or .zip files which are
// unpacked next to them) and writes compact summaries to <vault>/.brain/social.json.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { vaultPath } from '../lib/config.js'
import { summarize } from '../lib/importers.js'

const vault = vaultPath()
const imports = join(vault, 'Imports')
const MAX_BYTES = 80 * 1024 * 1024
const TEXT = /\.(json|js|csv)$/i

mkdirSync(imports, { recursive: true })
// Unpack any .zip that hasn't been unpacked yet.
for (const name of readdirSync(imports)) {
  if (!name.toLowerCase().endsWith('.zip')) continue
  const dest = join(imports, name.replace(/\.zip$/i, ''))
  if (!existsSync(dest)) execFileSync('unzip', ['-q', '-o', join(imports, name), '-d', dest])
}

function readTextFiles(dir, base = dir, out = {}) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === '__MACOSX') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) readTextFiles(full, base, out)
    else if (TEXT.test(name) && st.size < MAX_BYTES) out[relative(base, full)] = readFileSync(full, 'utf8')
  }
  return out
}

const platforms = []
for (const name of readdirSync(imports)) {
  const full = join(imports, name)
  if (name.startsWith('.') || !statSync(full).isDirectory()) continue
  for (const s of summarize(readTextFiles(full))) platforms.push({ ...s, from: name })
}

writeFileSync(join(vault, '.brain/social.json'), JSON.stringify({ updated: new Date().toISOString(), platforms }, null, 2))
console.log(`✅ imports: ${platforms.map(p => p.platform).join(', ') || 'nothing recognised yet'} → .brain/social.json`)
