// Usage: node scripts/install-notifications.js [--remove]
// Installs a macOS LaunchAgent that runs scripts/notify.js at 8:00 (briefing ready) and 20:00
// (due tomorrow). Remove it any time with --remove.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const label = 'com.brain-site.notify'
const dir = join(homedir(), 'Library/LaunchAgents')

for (const [mode, hour] of [['morning', 8], ['evening', 20]]) {
  const plist = join(dir, `${label}.${mode}.plist`)
  if (existsSync(plist)) { try { execFileSync('launchctl', ['unload', plist]) } catch { /* not loaded */ } rmSync(plist) }
  if (process.argv.includes('--remove')) { console.log(`removed ${mode}`); continue }
  mkdirSync(dir, { recursive: true })
  writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}.${mode}</string>
  <key>ProgramArguments</key><array><string>${process.execPath}</string><string>${join(root, 'scripts/notify.js')}</string><string>${mode}</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardErrorPath</key><string>/tmp/${label}.${mode}.log</string>
</dict></plist>
`)
  execFileSync('launchctl', ['load', plist])
  console.log(`✅ ${mode} notification at ${hour}:00`)
}
