import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { localApi } from './lib/local-api.js'
import { phoneGate } from './lib/phone-gate.js'
import site from './site.config.json' with { type: 'json' }

const root = import.meta.dirname
const vault = resolve(root, process.env.VAULT_PATH || site.vaultPath)
const isPrivate = process.env.VITE_GRAPH === 'private'

// Serves the full private brain at /data/graph.private.json — dev server only.
// It is never part of `vite build`, so it can't end up on the public site.
const privateGraph = {
  name: 'private-graph',
  apply: 'serve',
  configureServer(server) {
    // The raw private folder (full data, phone key) is never served as a file — only through the route below.
    server.middlewares.use((req, res, next) => {
      if (decodeURIComponent(req.url).replace(/^\/+/, '').startsWith('.private')) { res.statusCode = 404; return res.end() }
      next()
    })
    server.middlewares.use('/data/graph.private.json', (_req, res) => {
      try {
        res.setHeader('Content-Type', 'application/json')
        res.end(readFileSync('.private/graph.json'))
      } catch {
        res.statusCode = 404
        res.end('Run `npm run export:private` first')
      }
    })
  },
}

// index.html placeholders like {{title}} come from site.config.json.
const htmlFromConfig = { name: 'site-config-html', transformIndexHtml: (html) => html.replace(/\{\{(\w+)\}\}/g, (_, k) => String(site[k] ?? '').replace(/"/g, '&quot;')) }

export default defineConfig({
  // The local API (capture, ask, ingest…) only exists in the private dev server.
  // The phone gate runs first so nothing (not even the app code) is served to an unknown device.
  plugins: [htmlFromConfig, ...(isPrivate ? [phoneGate({ root })] : []), react(), tailwindcss(), privateGraph, ...(isPrivate ? [localApi({ vault, root })] : [])],
  // Never serve the raw private data or phone key as files, even on the network.
  server: { allowedHosts: true },
  // three.js alone is ~1 MB; it's split into its own lazily-loaded chunk.
  build: { chunkSizeWarningLimit: 1600 },
})
