import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { localApi } from './lib/local-api.js'

const root = import.meta.dirname
const vault = resolve(process.env.VAULT_PATH || resolve(root, '../second_project'))
const isPrivate = process.env.VITE_GRAPH === 'private'

// Serves the full private brain at /data/graph.private.json — dev server only.
// It is never part of `vite build`, so it can't end up on the public site.
const privateGraph = {
  name: 'private-graph',
  apply: 'serve',
  configureServer(server) {
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

export default defineConfig({
  // The local API (capture, ask, ingest…) only exists in the private dev server.
  plugins: [react(), tailwindcss(), privateGraph, ...(isPrivate ? [localApi({ vault, root })] : [])],
  // three.js alone is ~1 MB; it's split into its own lazily-loaded chunk.
  build: { chunkSizeWarningLimit: 1600 },
})
