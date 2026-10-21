// Local API for the private dashboard. Dev server only (`npm run dev:private`) — it is never part of
// `vite build`, so none of this exists on the public site.
//
// Every request must be a POST from this page: it needs the X-Brain header, which a browser won't
// send cross-site without a CORS preflight that we never approve, so other websites can't drive it.
import { spawn, execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, watch, writeFileSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { homedir } from 'node:os'
import { promisify } from 'node:util'
import { captureNote, uniqueName, toggleTask, setVisibility, areaNote, setTaskDue } from './actions.js'
import { parseCheckin, linkFirstMention } from './life.js'
import { isTrusted } from './phone-gate.js'
import { review } from './srs.js'
import { LOCAL_SCRIPTS } from '../sources/index.js'
import { parseActions } from './assist.js'
import { applyActions as applyToStore } from './apply.js'

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
  // Real-time email: just Gmail → notes, Inbox page and deadlines. No briefing, news or publishing.
  email: () => ({
    prompt: '/ingest Only the Gmail part of step 1 (including .brain/email.json, People, deadlines, the tracker), ' +
      'then step 2 for notes you touched, then steps 4.1–4.3. Skip everything else. Be quick.',
    tools: [...WRITE_TOOLS, ...SOURCE_TOOLS],
  }),
  // Turn a note (e.g. a lecture) into question/answer cards for spaced review.
  quiz: (title) => {
    if (!title?.trim()) throw new Error('Pick a note to make a quiz from')
    return {
      prompt: `Read the note "${title.trim()}" in this vault. Write 5–8 flashcards that test understanding (not trivia): ` +
        'questions in my words, short answers, formulas in LaTeX ($...$). Append them to .brain/cards.json, a JSON array of ' +
        `{"id": "quiz-<short-slug>", "front": "question", "back": "answer", "note": "${title.trim()}"}; create the file as [] if missing, ` +
        'and never remove existing cards. Reply with one line saying how many cards you added.',
      tools: [...READ_TOOLS, 'Write', 'Edit'],
    }
  },
  tidy: () => ({
    prompt: '/ingest Only do the Inbox part of step 1, then step 2 (Connect) for the notes you touched, ' +
      'then steps 4.2–4.4. Skip Gmail, Drive, GitHub and the briefing.',
    tools: WRITE_TOOLS,
  }),
  // Answers from the vault and may propose actions; it can only read — changes happen on Apply.
  ask: (text) => {
    if (!text?.trim()) throw new Error('Type a question first')
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })
    return { prompt: `/assist ${text.trim()}\n\n(Today is ${today}.)`, tools: READ_TOOLS }
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
  // The vault as a store for lib/apply.js. Paths are checked to stay inside the vault.
  const safe = (rel) => {
    const full = resolve(vault, rel)
    if (relative(vault, full).startsWith('..') || /(^|\/)\.git(\/|$)/.test(rel)) throw new Error('Bad path')
    return full
  }
  const store = {
    read: (rel) => { try { return readFileSync(safe(rel), 'utf8') } catch { return null } },
    write: (rel, text) => { const full = safe(rel); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, text) },
    move: (from, to) => { const dest = safe(to); if (existsSync(dest)) throw new Error(`${to} already exists`); mkdirSync(dirname(dest), { recursive: true }); renameSync(safe(from), dest) },
    notes: () => walkNotes(vault),
  }
  function runActions(actions, dryRun) {
    const { actions: valid, rejected } = parseActions('```actions\n' + JSON.stringify(actions ?? []) + '\n```')
    if (rejected.length) throw new Error(`Not applied: ${rejected.join('; ')}`)
    return applyToStore(valid, store, { today: today(), dryRun })
  }
  const reexport = () => run('node', ['scripts/export-vault.js', '--mode', 'private', '--vault', vault], { cwd: root })
  const commit = async (msg, files) => {
    await run('git', ['add', '--', ...files], { cwd: vault })
    await run('git', ['commit', '-q', '-m', msg, '--', ...files], { cwd: vault }).catch(() => {}) // nothing to commit is fine
  }

  const routes = {
    async capture({ text }) {
      const note = captureNote(text, today())
      // Note names are unique across the whole vault, because [[links]] go by name.
      const taken = new Set(noteNames(vault))
      const name = uniqueName(note.title, n => taken.has(n.toLowerCase()))
      const file = `00-Inbox/${name}.md`
      writeFileSync(join(vault, file), note.content.replace(`# ${note.title}`, `# ${name}`))
      await commit(`Capture: ${name}`, [file])
      await reexport()
      return { title: name }
    },
    // Health check-in from the command bar ("slept 7h, gym, mood 4").
    async checkin({ text }) {
      const parsed = parseCheckin(text)
      if (!Object.keys(parsed).length) throw new Error('Nothing to log. Try "slept 7h, gym, mood 4/5".')
      const file = join(vault, '.brain/checkins.json')
      const data = readJsonFile(file, { items: [] })
      data.items.push({ date: today(), at: new Date().toISOString(), text: text.replace(/^\s*log\b[:\s]*/i, ''), ...parsed })
      writeFileSync(file, JSON.stringify(data, null, 2))
      await commit(`Log: ${Object.keys(parsed).join(', ')}`, ['.brain/checkins.json'])
      await reexport()
      return { logged: parsed }
    },
    // Internship tracker: add or move an application.
    async application({ id, stage, company, role, url, note }) {
      const STAGES = ['saw', 'applied', 'interview', 'offer', 'closed']
      if (stage && !STAGES.includes(stage)) throw new Error('Unknown stage')
      const file = join(vault, '.brain/applications.json')
      const data = readJsonFile(file, { items: [] })
      let item = id && data.items.find(i => i.id === id)
      if (!item) {
        if (!company?.trim()) throw new Error('Company is required')
        item = { id: `${company}-${role ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), company: company.trim(), role: role?.trim() ?? '', url: url ?? null, note: note ?? null, source: 'me', stage: 'saw' }
        data.items.push(item)
      }
      if (stage) { item.stage = stage; item.updated = today() }
      writeFileSync(file, JSON.stringify(data, null, 2))
      await commit(`Track: ${item.company} → ${item.stage}`, ['.brain/applications.json'])
      await reexport()
      return { item }
    },
    // One-click link suggestion: turn the first plain mention of `title` in a note into [[title]].
    async linkMention({ path, title }) {
      const full = inVault(path)
      writeFileSync(full, linkFirstMention(readFileSync(full, 'utf8'), title))
      await commit(`Link: ${title} in ${path}`, [path])
      await reexport()
      return { ok: true }
    },
    // Activity history for the weekly charts, from the vault's git log.
    async stats() {
      const { stdout } = await run('git', ['log', '--since=45.days', '--format=%ad|%s', '--date=short'], { cwd: vault })
      const rows = stdout.trim().split('\n').filter(Boolean).map(l => { const [date, ...s] = l.split('|'); return { date, subject: s.join('|') } })
      return {
        tasksDone: rows.filter(r => r.subject.startsWith('Done:')).map(r => r.date),
        captures: rows.filter(r => r.subject.startsWith('Capture:')).map(r => r.date),
        refreshes: rows.filter(r => /^(Nightly ingest|Ingest)/.test(r.subject)).map(r => r.date),
      }
    },
    // The assistant's proposed actions: preview resolves each to exactly what it would change (nothing
    // written); apply re-checks everything and writes all of it or none of it, as one undoable commit.
    async previewActions({ actions }) {
      return runActions(actions, true)
    },
    async applyActions({ actions }) {
      const out = runActions(actions, false)
      if (!out.applied) throw new Error(out.results.filter(r => !r.ok).map(r => r.error).join(' ') || 'Nothing applied')
      if (out.touched.length) {
        // One path at a time, so a moved note's old (now missing) path is recorded as a deletion.
        for (const rel of out.touched) await run('git', ['add', '-A', '--', rel], { cwd: vault }).catch(() => {})
        await run('git', ['commit', '-q', '-m', `Assist: ${out.results.map(r => r.type).join(', ')}`], { cwd: vault }).catch(() => {})
      }
      await reexport()
      return { applied: out.results.length, results: out.results }
    },
    // Grade a flashcard (again / hard / good / easy); SM-2 decides when it comes back.
    async review({ cardId, grade }) {
      if (!cardId) throw new Error('Missing card')
      const file = join(vault, '.brain/reviews.json')
      const data = readJsonFile(file, {})
      data[cardId] = review(data[cardId], grade, today())
      writeFileSync(file, JSON.stringify(data, null, 2))
      await reexport()
      return { next: data[cardId].due }
    },
    async createArea({ name }) {
      const note = areaNote(name, today())
      const file = `03-Areas/${note.title}.md`
      if (new Set(noteNames(vault)).has(note.title.toLowerCase())) throw new Error(`You already have a note called "${note.title}"`)
      writeFileSync(join(vault, file), note.content)
      await commit(`Make area: ${note.title}`, [file])
      await reexport()
      return { title: note.title }
    },
    async task({ path, index, done }) {
      const full = inVault(path)
      writeFileSync(full, toggleTask(readFileSync(full, 'utf8'), index, done))
      await commit(`${done ? 'Done' : 'Reopen'}: task in ${path}`, [path])
      await reexport()
      return { ok: true }
    },
    // Push a task to a new day (Snooze).
    async snooze({ path, index, date }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Bad date')
      const full = inVault(path)
      writeFileSync(full, setTaskDue(readFileSync(full, 'utf8'), index, date))
      await commit(`Snooze: task in ${path} to ${date}`, [path])
      await reexport()
      return { ok: true }
    },
    // Hide an email from the Inbox once it's dealt with (or bring it back).
    async emailHandled({ url, handled }) {
      const file = join(vault, '.brain/email.json')
      const data = JSON.parse(readFileSync(file, 'utf8'))
      const item = data.items.find(i => i.url === url)
      if (!item) throw new Error('That email is no longer in the inbox')
      item.handled = !!handled
      writeFileSync(file, JSON.stringify(data, null, 2))
      await commit(`${handled ? 'Handled' : 'Reopen'}: ${item.subject}`, ['.brain/email.json'])
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
      if (!/^(Nightly ingest|Ingest|Capture|Done|Reopen|Make |Tidy|Snooze|Handled|Log|Track|Link|Assist)/.test(subject)) {
        throw new Error(`The last change ("${subject}") wasn't made by the dashboard, so it wasn't undone.`)
      }
      await run('git', ['revert', '--no-edit', 'HEAD'], { cwd: vault })
      await reexport()
      return { undone: subject }
    },
    // Re-read local folders and data exports (no AI needed), then refresh the dashboard data.
    async rescan() {
      // Every local source registered in sources/index.js; one failing doesn't stop the others.
      for (const script of LOCAL_SCRIPTS) {
        await run('node', [script, '--vault', vault], { cwd: root, timeout: 240000 }).catch(() => {})
      }
      await reexport()
      return { ok: true }
    },
    // Reveal a file from the index in Finder. Only paths that are in the index are allowed.
    async reveal({ path }) {
      const index = JSON.parse(readFileSync(join(vault, '.brain/files.json'), 'utf8'))
      if (!index.recent.some(f => f.path === path)) throw new Error('That file is not in the index')
      await run('open', ['-R', path.replace(/^~/, homedir())])
      return { ok: true }
    },
    // Open the Imports folder so exports can be dropped in.
    async openImports() {
      await run('open', [join(vault, 'Imports')])
      return { ok: true }
    },
    // Pull what the cloud morning run pushed, then refresh the dashboard's data.
    async sync() {
      const { stdout } = await run('git', ['pull', '--ff-only'], { cwd: vault, timeout: 30000 }).catch(e => ({ stdout: e.message }))
      await reexport()
      return { pulled: !/Already up to date/.test(stdout) }
    },
    // When the dashboard data last changed; open tabs poll this and reload when it moves.
    async version() {
      try { return { at: statSync(join(root, '.private/graph.json')).mtimeMs } } catch { return { at: 0 } }
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

  // Real-time: re-export when notes change (e.g. edited in Obsidian), read new app exports as they
  // land in Imports/, and check email on a timer (minutes in .brain/sources.json → live.emailEveryMinutes; 0 = off).
  function startLive() {
    const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms) } }
    const exportSoon = debounce(() => reexport().catch(() => {}), 1500)
    const importSoon = debounce(() => run('node', ['scripts/import-exports.js', '--vault', vault], { cwd: root }).then(exportSoon).catch(() => {}), 3000)
    try {
      watch(vault, { recursive: true }, (_e, file) => {
        if (!file || /(^|\/)\.(git|obsidian|trash)\//.test(file) || file.startsWith('.git')) return
        if (file.startsWith('Imports')) importSoon()
        else if (file.endsWith('.md') || /^\.brain\/.*\.json$/.test(file)) exportSoon()
      })
    } catch { /* watching not supported — the dashboard still works, just without live updates */ }
    const minutes = readJsonFile(join(vault, '.brain/sources.json'), {}).live?.emailEveryMinutes ?? 60
    if (minutes > 0) {
      setInterval(() => {
        if (busy) return
        busy = 'email'
        const child = spawn('claude', ['-p', JOBS.email().prompt, '--permission-mode', 'acceptEdits',
          '--allowedTools', JOBS.email().tools.join(','), '--disallowedTools', NEVER.join(',')], { cwd: vault, stdio: 'ignore' })
        child.on('close', () => { busy = null; exportSoon() })
        child.on('error', () => { busy = null })
      }, minutes * 60000)
    }
  }

  return {
    name: 'brain-local-api',
    apply: 'serve',
    configureServer(server) {
      startLive()
      server.middlewares.use('/api/', async (req, res) => {
        if (req.method !== 'POST' || req.headers['x-brain'] !== '1' || !isTrusted(req, root)) {
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

function readJsonFile(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return fallback }
}

// Vault-relative paths of every note.
function walkNotes(dir, base = dir) {
  return readdirSync(dir).flatMap(name => {
    if (name.startsWith('.') || name === 'node_modules') return []
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return walkNotes(full, base)
    return name.endsWith('.md') ? [relative(base, full)] : []
  })
}

function noteNames(dir) {
  return readdirSync(dir).flatMap(name => {
    if (name.startsWith('.') || name === 'node_modules') return []
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return noteNames(full)
    return name.endsWith('.md') ? [name.slice(0, -3).toLowerCase()] : []
  })
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
