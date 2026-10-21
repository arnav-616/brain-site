// Usage: node scripts/og-cards.js   (runs after export:public)
// For every public note: a 1200×630 preview image (public/og/<slug>.png) and a tiny share page
// (public/n/<slug>.html) whose link preview shows that note, then opens it in the 3D brain.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { topicColors, colorOf } from '../src/theme.js'
import { summaryOf } from '../lib/showcase.js'
import { slug } from '../lib/slug.js'
import { site } from '../lib/config.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = process.env.SITE_URL || site.siteUrl
const graph = JSON.parse(readFileSync(join(root, 'public/data/graph.json'), 'utf8'))
const topics = topicColors(graph.nodes)
const esc = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const clean = (s) => s.replace(/\[\[([^\]|]+)(\|([^\]]*))?\]\]/g, (_, t, _a, alias) => alias || t).replace(/[*_`$\\]/g, '')

function wrap(text, max, lines) {
  const out = []
  let line = ''
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > max) { out.push(line); line = w; if (out.length === lines) break } else line = (line + ' ' + w).trim()
  }
  if (out.length < lines && line) out.push(line)
  if (out.length === lines && text.length > out.join(' ').length) out[lines - 1] = out[lines - 1].replace(/\W*\w*$/, '') + '…'
  return out
}

for (const d of ['og', 'n']) { rmSync(join(root, 'public', d), { recursive: true, force: true }); mkdirSync(join(root, 'public', d), { recursive: true }) }

for (const n of graph.nodes) {
  const color = colorOf(n, topics)
  const title = wrap(n.title, 26, 2)
  const summary = wrap(clean(summaryOf(n)), 52, 3)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><radialGradient id="g" cx="0.82" cy="0.3" r="0.55"><stop offset="0" stop-color="${color}" stop-opacity="0.45"/><stop offset="1" stop-color="#070818" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="#070818"/><rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="985" cy="190" r="34" fill="${color}"/><circle cx="985" cy="190" r="70" fill="${color}" opacity="0.18"/>
  <circle cx="860" cy="330" r="14" fill="${color}" opacity="0.7"/><circle cx="1080" cy="380" r="18" fill="${color}" opacity="0.6"/>
  <line x1="985" y1="190" x2="860" y2="330" stroke="${color}" stroke-opacity="0.35" stroke-width="2"/><line x1="985" y1="190" x2="1080" y2="380" stroke="${color}" stroke-opacity="0.35" stroke-width="2"/>
  <text x="80" y="110" font-family="Helvetica Neue, Arial, sans-serif" font-size="28" fill="#8A90B8">${esc(n.topic ? `${n.topic}` : 'note')}</text>
  ${title.map((l, i) => `<text x="80" y="${200 + i * 84}" font-family="Helvetica Neue, Arial, sans-serif" font-weight="700" font-size="76" fill="#E6E9FF">${esc(l)}</text>`).join('')}
  ${summary.map((l, i) => `<text x="80" y="${200 + (title.length - 1) * 84 + 90 + i * 46}" font-family="Helvetica Neue, Arial, sans-serif" font-size="34" fill="#C9CDF0">${esc(l)}</text>`).join('')}
  <text x="80" y="570" font-family="Helvetica Neue, Arial, sans-serif" font-size="28" font-weight="700" fill="#E6E9FF">${esc(site.title)}</text>
  <text x="${80 + site.title.length * 16 + 40}" y="570" font-family="Helvetica Neue, Arial, sans-serif" font-size="28" fill="#8A90B8">${esc(SITE.replace(/^https?:\/\//, ''))}</text>
</svg>`
  const s = slug(n.id)
  writeFileSync(join(root, 'public/og', `${s}.png`), new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng())
  const desc = esc(clean(summaryOf(n)).slice(0, 200))
  const target = `/#/note/${encodeURIComponent(n.id)}`
  writeFileSync(join(root, 'public/n', `${s}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(n.title)} · ${esc(site.title)}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${esc(n.title)} · ${esc(site.title)}"><meta property="og:description" content="${desc}">
<meta property="og:image" content="${SITE}/og/${s}.png"><meta property="og:url" content="${SITE}/n/${s}.html"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${target}"></head><body><a href="${target}">Open ${esc(n.title)}</a><script>location.replace(${JSON.stringify(target)})</script></body></html>
`)
}
console.log(`✅ share cards: ${graph.nodes.length} notes → public/og, public/n`)
