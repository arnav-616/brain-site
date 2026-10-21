// Usage: npm run test:ui   (needs `npm run dev` on :5181 and `npm run dev:private` on :5180, and Chrome)
// Screen tests: loads every page on desktop and phone sizes, checks it renders with no errors and the
// key controls are there, then runs an accessibility audit (axe-core) and lists any violations.
import puppeteer, { KnownDevices } from 'puppeteer-core'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PUBLIC = process.env.PUBLIC_URL || 'http://localhost:5181'
const PRIVATE = process.env.PRIVATE_URL || 'http://localhost:5180'

// [name, url, text or selector that must be visible]
const PAGES = [
  ['public: home', `${PUBLIC}/`, 'Take the tour'],
  ['public: note link', `${PUBLIC}/#/note/CAPM`, 'Copy link'],
  ['public: case study', `${PUBLIC}/case-study.html`, 'A second brain that grows itself'],
  ['private: brain home', `${PRIVATE}/#/brain`, 'Good '], // the day card (collapsed to a pill on phones)
  ...['today:Briefing', 'inbox:Inbox', 'people:People', 'career:Career', 'life:Life', 'feeds:Feeds', 'files:Files', 'timeline:Timeline', 'review:Review', 'settings:Settings']
    .map(s => { const [id, title] = s.split(':'); return [`private: ${id}`, `${PRIVATE}/#/${id}`, title] }),
]
const VIEWPORTS = [['desktop', { viewport: { width: 1440, height: 900 }, userAgent: '' }], ['phone', KnownDevices['iPhone 15 Pro'] ?? KnownDevices['iPhone 13 Pro']]]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failures = 0
const a11y = new Map()

for (const [vpName, device] of VIEWPORTS) {
  const page = await browser.newPage()
  if (device.userAgent) await page.emulate(device); else await page.setViewport(device.viewport)
  for (const [name, url, expect] of PAGES) {
    const errors = []
    const onErr = e => errors.push(e.message)
    page.on('pageerror', onErr)
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForFunction(t => document.body.innerText.includes(t), { timeout: 20000 }, expect)
      await new Promise(r => setTimeout(r, 900)) // let entrance animations (fades) finish before measuring contrast
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      if (overflow) errors.push('content is wider than the screen')
      await page.addScriptTag({ content: AXE })
      const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations
        .map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, target: v.nodes[0]?.target?.join(' ') })))
      for (const v of res) {
        const key = `${v.id}|${v.target}`
        if (!a11y.has(key)) a11y.set(key, { ...v, where: new Set() })
        a11y.get(key).where.add(`${name} (${vpName})`)
      }
    } catch (e) { errors.push(e.message.split('\n')[0]) }
    page.off('pageerror', onErr)
    if (errors.length) { failures++; console.log(`✗ ${name} (${vpName}): ${errors.join('; ')}`) } else console.log(`✓ ${name} (${vpName})`)
  }
  await page.close()
}
await browser.close()

const serious = [...a11y.values()].filter(v => ['serious', 'critical'].includes(v.impact))
console.log(`\nAccessibility: ${a11y.size} issue type(s), ${serious.length} serious or critical`)
for (const v of a11y.values()) console.log(`  [${v.impact}] ${v.help} — ${v.id} at ${v.target} (${[...v.where].slice(0, 3).join(', ')}${v.where.size > 3 ? '…' : ''})`)
process.exit(failures || serious.length ? 1 : 0)
