import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

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
  plugins: [react(), tailwindcss(), privateGraph],
})
