// Usage: node scripts/notify.js morning|evening [--vault <path>]
// Mac notifications: pulls the latest vault (the cloud routine pushes the morning briefing), then
// morning: "Your briefing is ready: 3 things today, HackFest in 25 days"
// evening: anything due tomorrow. Run by launchd (see scripts/install-notifications.js).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { vaultPath } from '../lib/config.js'
import { parseBriefing, parseTasks, section } from '../lib/briefing.js'

const mode = process.argv[2] ?? 'morning'
const vault = vaultPath()
const today = new Date().toLocaleDateString('en-CA')
const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('en-CA')
const read = (f, fallback) => { try { return readFileSync(join(vault, f), 'utf8') } catch { return fallback } }

try { execFileSync('git', ['pull', '--ff-only', '--quiet'], { cwd: vault, timeout: 30000 }) } catch { /* offline is fine */ }

const notify = (title, text) => execFileSync('osascript', ['-e',
  `display notification ${JSON.stringify(text)} with title ${JSON.stringify(title)} sound name "Glass"`])

const deadlines = JSON.parse(read('.brain/deadlines.json', '[]')).filter(d => !d.done && d.date >= today).sort((a, b) => a.date.localeCompare(b.date))
const body = read('Today.md', '').replace(/^---[\s\S]*?---\n/, '')
const tasks = parseTasks(section(parseBriefing(body), 'needs')?.body, today).filter(t => !t.done && !t.overdue && !t.later)

if (mode === 'morning') {
  const next = deadlines[0]
  const days = next && Math.round((new Date(next.date) - new Date(today)) / 864e5)
  const parts = [tasks.length ? `${tasks.length} thing${tasks.length === 1 ? '' : 's'} need you today` : 'Nothing needs you today']
  if (next) parts.push(`${next.title.split(' (')[0]} ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`)
  notify('Your briefing is ready', parts.join('. ') + '.')
} else {
  const due = [...deadlines.filter(d => d.date === tomorrow).map(d => d.title), ...tasks.filter(t => t.due === tomorrow).map(t => t.text.replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a))]
  if (due.length) notify('Due tomorrow', due.slice(0, 3).join(' · '))
}
