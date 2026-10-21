// Usage: node scripts/read-apple.js [--vault <path>]
// Reads the Mac's Calendar (next 14 days), Reminders (open ones) and Notes (edited in the last
// 7 days) through macOS automation, and writes .brain/calendar.json, .brain/reminders.json and
// .brain/apple-notes.json in the vault. Each source is independent: if macOS blocks one (no
// permission yet), the others still run. First run may show a macOS "allow access" prompt.
import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { vaultPath } from '../lib/config.js'

const vault = vaultPath()

// Runs a JXA snippet that returns JSON; gives up after `ms` so a pending permission prompt can't hang us.
const jxa = (code, ms = 60000) => new Promise((ok, fail) => {
  execFile('osascript', ['-l', 'JavaScript', '-e', `JSON.stringify((() => { ${code} })())`], { timeout: ms, maxBuffer: 20e6 },
    (err, out) => (err ? fail(new Error(err.killed ? 'timed out (allow access in System Settings → Privacy & Security → Automation)' : err.message.split('\n')[0])) : ok(JSON.parse(out))))
})

const SKIP_CALENDARS = ['Siri Suggestions', 'Scheduled Reminders']

const jobs = {
  calendar: () => jxa(`
    const now = new Date(), end = new Date(now.getTime() + 14 * 864e5)
    const out = []
    for (const cal of Application('Calendar').calendars()) {
      if (${JSON.stringify(SKIP_CALENDARS)}.includes(cal.name())) continue
      const evs = cal.events.whose({ _and: [{ startDate: { _greaterThan: new Date(now.getTime() - 864e5) } }, { startDate: { _lessThan: end } }] })()
      for (const e of evs) out.push({ title: e.summary(), start: e.startDate().toISOString(), end: e.endDate().toISOString(), allDay: e.alldayEvent(), calendar: cal.name(), location: e.location() || null })
    }
    return out.sort((a, b) => a.start.localeCompare(b.start))`),
  reminders: () => jxa(`
    return Application('Reminders').reminders.whose({ completed: false })().map(r => ({
      title: r.name(), due: r.dueDate() ? r.dueDate().toISOString() : null, list: r.container().name(), notes: r.body() || null,
    }))`),
  'apple-notes': () => jxa(`
    const since = new Date(Date.now() - 7 * 864e5)
    return Application('Notes').notes.whose({ modificationDate: { _greaterThan: since } })().slice(0, 40).map(n => ({
      title: n.name(), modified: n.modificationDate().toISOString(), folder: n.container().name(), text: n.plaintext().slice(0, 3000),
    }))`, 90000),
}

for (const [name, run] of Object.entries(jobs)) {
  try {
    const items = await run()
    writeFileSync(join(vault, `.brain/${name}.json`), JSON.stringify({ updated: new Date().toISOString(), items }, null, 2))
    console.log(`✅ ${name}: ${items.length}`)
  } catch (e) {
    writeFileSync(join(vault, `.brain/${name}.json`), JSON.stringify({ updated: new Date().toISOString(), error: e.message, items: [] }, null, 2))
    console.log(`⚠️  ${name}: ${e.message}`)
  }
}
