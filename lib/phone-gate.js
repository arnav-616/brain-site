// Phone access for the private dev server (`npm run dev:phone`). On this laptop (localhost) nothing
// changes. From any other device, every request needs the secret key: open the link from
// `npm run phone:link` once, which stores the key in a cookie, and the phone is let in from then on.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function phoneKey(root) {
  const file = join(root, '.private/phone-key')
  if (!existsSync(file)) { mkdirSync(join(root, '.private'), { recursive: true }); writeFileSync(file, randomBytes(24).toString('base64url')) }
  return readFileSync(file, 'utf8').trim()
}

const isLocal = (req) => ['localhost', '127.0.0.1', '[::1]'].includes((req.headers.host || '').replace(/:\d+$/, ''))
const cookieKey = (req) => (req.headers.cookie || '').match(/(?:^|;\s*)brain_key=([^;]+)/)?.[1]

export function phoneGate({ root }) {
  const key = phoneKey(root)
  return {
    name: 'brain-phone-gate',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (isLocal(req) || cookieKey(req) === key) return next()
        const given = new URL(req.url, 'http://x').searchParams.get('key')
        if (given === key) {
          res.setHeader('Set-Cookie', `brain_key=${key}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`)
          res.statusCode = 302; res.setHeader('Location', '/'); return res.end()
        }
        res.statusCode = 401
        res.setHeader('Content-Type', 'text/html')
        res.end('<body style="background:#070818;color:#E6E9FF;font:16px system-ui;padding:2rem">This brain is private. Open the link from <code>npm run phone:link</code> on your laptop.</body>')
      })
    },
  }
}

// The local API is safe to call from a device that passed the gate.
export const isTrusted = (req, root) => isLocal(req) || cookieKey(req) === phoneKey(root)
