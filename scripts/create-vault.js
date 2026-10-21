// Usage: node scripts/create-vault.js <folder> [--name "Your Name"]
// Makes a new second-brain vault from template-vault/ and points site.config.json at it.
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, resolve } from 'node:path'
import { root } from '../lib/config.js'

const target = process.argv[2]
if (!target) { console.log('Usage: npm run create-vault -- <folder> [--name "Your Name"]'); process.exit(1) }
const dest = resolve(target)
if (existsSync(dest)) { console.log(`${dest} already exists. Pick a new folder.`); process.exit(1) }
const i = process.argv.indexOf('--name')
const name = i > -1 ? process.argv[i + 1] : 'Me'

cpSync(join(root, 'template-vault'), dest, { recursive: true })
try { execFileSync('git', ['init', '-q'], { cwd: dest }); execFileSync('git', ['add', '-A'], { cwd: dest }); execFileSync('git', ['commit', '-qm', 'New second brain'], { cwd: dest }) } catch { /* git optional */ }

const cfgFile = join(root, 'site.config.json')
const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'))
Object.assign(cfg, {
  owner: name, title: `${name}'s Brain`, vaultPath: relative(root, dest), vaultName: dest.split('/').pop(),
  askExamples: [`What is ${name} learning?`, 'What has been built here?'],
})
writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n')
console.log(`✅ New vault at ${dest}\n   Open it in Obsidian, then run: npm run dev:private`)
