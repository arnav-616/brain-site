// Prints the one-time link that lets your phone into the private brain (run `npm run dev:phone` first).
// Uses your Tailscale address when Tailscale is running (works anywhere), otherwise your Wi-Fi address.
import { execFileSync } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phoneKey } from '../lib/phone-gate.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let host, via
try { host = execFileSync('tailscale', ['ip', '-4'], { encoding: 'utf8' }).trim().split('\n')[0]; via = 'Tailscale (works from anywhere)' } catch {
  host = Object.values(networkInterfaces()).flat().find(a => a?.family === 'IPv4' && !a.internal)?.address
  via = 'your Wi-Fi (phone must be on the same network)'
}
if (!host) { console.log('No network address found.'); process.exit(1) }
// Tailscale's https name (via `tailscale serve`) is a secure origin, which also enables the offline copy.
let https = null
try { https = JSON.parse(execFileSync('tailscale', ['status', '--json'], { encoding: 'utf8' })).Self.DNSName.replace(/\.$/, '') } catch { /* no Tailscale */ }
if (https) {
  console.log(`\nBest: an https link that also keeps an offline copy on your phone. Run once:\n\n  tailscale serve --bg 5180\n\nthen open on your phone and "Add to Home Screen":\n\n  https://${https}/?key=${phoneKey(root)}\n`)
}
console.log(`\nOpen this on your phone (via ${via}), then "Add to Home Screen":\n\n  http://${host}:5180/?key=${phoneKey(root)}\n\nKeep it private: anyone with this link can see your brain.\n`)
