// Local API for the private dashboard. Dev server only (`npm run dev:private`) — it is never part of
// `vite build`, so none of this exists on the public site.
//
// Every request must be a POST from this page: it needs the X-Brain header, which a browser won't
// send cross-site without a CORS preflight that we never approve, so other websites can't drive it.
import { spawn, execFile } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { promisify } from 'node:util'
import { captureNote, uniqueName, toggleTask, setVisibility } from './actions.js'

const run = promisify(execFile)

const READ_TOOLS = ['Read', 'Glob', 'Grep']
const WRITE_TOOLS = [...READ_TOOLS, 'Write', 'Edit', 'WebFetch', 'WebSearch',
  'Bash(git:*)', 'Bash(gh:*)', 'Bash(npm:*)', 'Bash(node:*)', 'Bash(ls:*)', 'Bash(mkdir:*)', 'Bash(mv:*)', 'Bash(date:*)']
const SOURCE_TOOLS = [
  'mcp__claude_ai_Gmail__search_threads', 'mcp__claude_ai_Gmail__get_thread', 'mcp__claude_ai_Gmail__get_message',
  'mcp__claude_ai_Gmail__create_draft', 'mcp__claude_ai_Gmail__list_drafts',
  'mcp__claude_ai_Google_Drive__search_files', 'mcp__claude_ai_Google_Drive__read_file_content',
  'mcp__claude_ai_Google_Drive__get_file_metadata', 'mcp__claude_ai_Google_Drive__download_file_content',
]
// Belt and braces: the dashboard can draft email, never send or delete anything.
const NEVER = [
  'mcp__claude_ai_Gmail__send_message', 'mcp__claude_ai_Gmail__reply', 'mcp__claude_ai_Gmail__forward',
  'mcp__claude_ai_Gmail__trash_message', 'mcp__claude_ai_Gmail__trash_thread', 'mcp__claude_ai_Gmail__delete_draft',
  'mcp__claude_ai_Google_Drive__trash_file', 'mcp__claude_ai_Google_Drive__share_file', 'Bash(rm:*)',
]

const JOBS = {
  ingest: () => ({ prompt: '/ingest', tools: [...WRITE_TOOLS, ...SOURCE_TOOLS] }),
  tidy: () => ({
    prompt: '/ingest Only do the Inbox part of step 1, then step 2 (Connect) for the notes you touched, ' +
      'then steps 4.2–4.4. Skip Gmail, Drive, GitHub and the briefing.',
    tools: WRITE_TOOLS,
  }),
  ask: (text) => {
    if (!text?.trim()) throw new Error('Type a question first')
    return { prompt: `/ask-brain ${text.trim()}`, tools: READ_TOOLS }
  },
}

export function localApi({ vault, root }) {
  let busy = null // only one Claude job at a time

  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const inVault = (p) => {
    const full = resolve(vault, p)
    if (relative(vault, full).startsWith('..') || !full.endsWith('.md')) throw new Error('Bad note path')
    return full
  }
  const reexport = () => run('node', ['scripts/export-vault.js', '--mode', 'private', '--vault', vault], { cwd: root })
  const commit = async (msg, files) => {
    await run('git', ['add', '--', ...files], { cwd: vault })
    await run('git', ['commit', '-q', '-m', msg, '--', ...files], { cwd: vault }).catch(() => {}) // nothing to commit is fine
  }

  const routes = {
    async capture({ text }) {
      const note = captureNote(text, today())
      const name = uniqueName(note.title, n => existsSync(join(vault, '00-Inbox', `${n}.md`)))
      const file = `00-Inbox/${name}.md`
      writeFileSync(join(vault, file), note.content.replace(`# ${note.title}`, `# ${name}`))
      await commit(`Capture: ${name}`, [file])
      await reexport()
      return { title: name }
    },
    async task({ path, index, done }) {
      const full = inVault(path)
      writeFileSync(full, toggleTask(readFileSync(full, 'utf8'), index, done))
      await commit(`${done ? 'Done' : 'Reopen'}: task in ${path}`, [path])
      await reexport()
      return { ok: true }
    },
    async visibility({ path, visibility }) {
      const full = inVault(path)
      writeFileSync(full, setVisibility(readFileSync(full, 'utf8'), visibility))
      await commit(`Make ${path} ${visibility}`, [path])
      await reexport()
      return { ok: true }
    },
    // Undo the most recent automated change (ingest, tidy, capture, toggles) with a revert commit.
    async undo() {
      const { stdout } = await run('git', ['log', '-1', '--format=%s'], { cwd: vault })
      const subject = stdout.trim()
      if (!/^(Nightly ingest|Ingest|Capture|Done|Reopen|Make |Tidy)/.test(subject)) {
        throw new Error(`The last change ("${subject}") wasn't made by the dashboard, so it wasn't undone.`)
      }
      await run('git', ['revert', '--no-edit', 'HEAD'], { cwd: vault })
      await reexport()
      return { undone: subject }
    },
    async runs() {
      const dir = join(vault, '.brain/log')
      const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md')).sort().reverse() : []
      return { log: files.slice(0, 2).map(f => readFileSync(join(dir, f), 'utf8')).join('\n\n') }
    },
  }

  // Streams a Claude Code run as newline-delimited JSON events: {type: 'text'|'tool'|'done'|'error'}.
  function stream(job, text, res) {
    if (busy) throw new Error(`Already running "${busy}" — wait for it to finish.`)
    const { prompt, tools } = JOBS[job](text)
    busy = job
    res.setHeader('Content-Type', 'application/x-ndjson')
    const send = (e) => res.write(JSON.stringify(e) + '\n')
    const child = spawn('claude', ['-p', prompt, '--output-format', 'stream-json', '--verbose',
      '--permission-mode', 'acceptEdits', '--allowedTools', tools.join(','), '--disallowedTools', NEVER.join(',')],
    { cwd: vault, stdio: ['ignore', 'pipe', 'pipe'] })
    let buf = '', err = ''
    child.stdout.on('data', chunk => {
      buf += chunk
      const lines = buf.split('\n'); buf = lines.pop()
      for (const line of lines) {
        let m; try { m = JSON.parse(line) } catch { continue }
        if (m.type === 'assistant') {
          for (const c of m.message?.content ?? []) {
            if (c.type === 'text' && c.text.trim()) send({ type: 'text', text: c.text })
            if (c.type === 'tool_use') send({ type: 'tool', text: describeTool(c) })
          }
        } else if (m.type === 'result') {
          send(m.is_error ? { type: 'error', text: m.result || 'Claude stopped with an error.' } : { type: 'done', text: m.result })
        }
      }
    })
    child.stderr.on('data', c => { err += c })
    child.on('error', e => { send({ type: 'error', text: `Couldn't start Claude Code: ${e.message}` }) })
    child.on('close', async code => {
      busy = null
      if (code && err) send({ type: 'error', text: err.trim().slice(-400) })
      if (job !== 'ask') await reexport().catch(() => {})
      res.end()
    })
    res.on('close', () => { if (child.exitCode === null && job === 'ask') child.kill() })
  }

  return {
    name: 'brain-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/', async (req, res) => {
        const host = (req.headers.host || '').split(':')[0]
        if (req.method !== 'POST' || req.headers['x-brain'] !== '1' || !['localhost', '127.0.0.1'].includes(host)) {
          res.statusCode = 403; return res.end('Forbidden')
        }
        let body = ''
        for await (const c of req) body += c
        const route = req.url.replace(/^\/|\?.*$/g, '')
        try {
          const data = body ? JSON.parse(body) : {}
          if (route === 'run' && JOBS[data.job]) return stream(data.job, data.text, res)
          if (!routes[route]) { res.statusCode = 404; return res.end('Unknown action') }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(await routes[route](data)))
        } catch (e) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e.stderr?.toString().trim() || e.message }))
        }
      })
    },
  }
}

// One readable line per tool call, for the progress feed.
function describeTool({ name, input = {} }) {
  const file = (p) => p?.split('/').pop()
  if (name === 'Read') return `Reading ${file(input.file_path)}`
  if (name === 'Write') return `Writing ${file(input.file_path)}`
  if (name === 'Edit') return `Editing ${file(input.file_path)}`
  if (name === 'Grep' || name === 'Glob') return `Searching notes for "${input.pattern}"`
  if (name === 'WebSearch') return `Searching the web: ${input.query}`
  if (name === 'WebFetch') return `Reading ${input.url}`
  if (name === 'Bash') return `Running ${String(input.command).split(' ').slice(0, 3).join(' ')}`
  if (name.includes('Gmail')) return 'Checking Gmail'
  if (name.includes('Google_Drive')) return 'Checking Google Drive'
  return name
}
