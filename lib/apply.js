// Applies the assistant's approved actions to the vault. Works against a small `store` interface, so
// tests can run it on an in-memory vault and the dashboard runs it on the real one:
//   store.read(rel) → text | null    store.write(rel, text)    store.move(from, to)    store.notes() → [rel]
// With dryRun, nothing is written: each action is resolved to exactly what it would touch, for the
// confirmation card. Anything ambiguous ("matches 2 tasks") is refused rather than guessed.
import { toggleTask, setTaskDue } from './actions.js'
import { addTaskToBriefing, newNote, appendToNote, describe } from './assist.js'
import { parseCheckin } from './life.js'

const BRIEFING = 'Today.md'
const TASK = /^[\s>]*[-*] \[([ xX])\]\s*(.*)$/
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const short = (s, n = 70) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const prettyDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Exactly one item containing every word of `match` (punctuation ignored); an exact match wins.
const words = (s) => norm(s).replace(/[^\p{L}\p{N}#]+/gu, ' ').trim().split(' ').filter(Boolean)
export function matchOne(items, textOf, match, what) {
  const m = norm(match)
  if (!m) throw new Error(`Say which ${what}`)
  const want = words(match)
  const hits = items.filter(it => { const have = words(textOf(it)).join(' '); return want.every(w => have.includes(w)) })
  const exact = hits.filter(it => norm(textOf(it)) === m)
  if (exact.length === 1) return exact[0]
  if (hits.length === 1) return hits[0]
  if (!hits.length) throw new Error(`No ${what} matching "${match}"`)
  throw new Error(`"${match}" matches ${hits.length} ${what}s (${hits.slice(0, 3).map(h => `"${short(textOf(h), 40)}"`).join(', ')}). Be more specific.`)
}

function tasksIn(raw) {
  const out = []
  let i = -1
  raw.split('\n').forEach((line, lineNo) => {
    const t = line.match(TASK)
    if (!t) return
    i++
    out.push({ index: i, lineNo, done: t[1] !== ' ', text: t[2].replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/, '').trim() })
  })
  return out
}

const json = (store, rel, fallback) => { try { return JSON.parse(store.read(rel) ?? '') } catch { return fallback } }

function noteByTitle(store, title) {
  const paths = store.notes()
  const name = (p) => p.split('/').pop().replace(/\.md$/, '')
  return matchOne(paths, name, title, 'note')
}

// Each handler resolves its target, says what it will do, and (unless dryRun) does it.
const HANDLERS = {
  add_task(a, ctx) {
    ctx.edit(BRIEFING, raw => addTaskToBriefing(raw ?? '', a.text, a.due))
    return describe(a)
  },
  complete_task(a, ctx) {
    const raw = ctx.read(BRIEFING) ?? ''
    const t = matchOne(tasksIn(raw).filter(t => !t.done), x => x.text, a.match, 'open task')
    ctx.edit(BRIEFING, r => toggleTask(r, t.index, true))
    return `Mark done: "${short(t.text)}"`
  },
  remove_task(a, ctx) {
    const raw = ctx.read(BRIEFING) ?? ''
    const t = matchOne(tasksIn(raw), x => x.text, a.match, 'task')
    ctx.edit(BRIEFING, r => r.split('\n').filter((_, i) => i !== t.lineNo).join('\n'))
    return `Remove task: "${short(t.text)}"`
  },
  reschedule_task(a, ctx) {
    const raw = ctx.read(BRIEFING) ?? ''
    const t = matchOne(tasksIn(raw).filter(t => !t.done), x => x.text, a.match, 'open task')
    ctx.edit(BRIEFING, r => setTaskDue(r, t.index, a.due))
    return `Move "${short(t.text)}" to ${prettyDate(a.due)}`
  },
  add_deadline(a, ctx) {
    ctx.editJson('.brain/deadlines.json', [], list => [...list, { date: a.date, title: a.title, note: a.note ?? null, source: 'me', done: false }])
    return describe(a)
  },
  remove_deadline(a, ctx) {
    const list = ctx.readJson('.brain/deadlines.json', [])
    const d = matchOne(list.filter(x => !x.done), x => x.title, a.match, 'deadline')
    ctx.editJson('.brain/deadlines.json', [], l => l.filter(x => x !== l.find(y => y.title === d.title && y.date === d.date)))
    return `Remove deadline: "${short(d.title)}" (${prettyDate(d.date)})`
  },
  reschedule_deadline(a, ctx) {
    const list = ctx.readJson('.brain/deadlines.json', [])
    const d = matchOne(list.filter(x => !x.done), x => x.title, a.match, 'deadline')
    ctx.editJson('.brain/deadlines.json', [], l => l.map(x => (x.title === d.title && x.date === d.date ? { ...x, date: a.date } : x)))
    return `Move deadline "${short(d.title)}" from ${prettyDate(d.date)} to ${prettyDate(a.date)}`
  },
  hide_event(a, ctx) {
    const events = ctx.readJson('.brain/calendar.json', { items: [] }).items ?? []
    const hidden = ctx.readJson('.brain/hidden.json', { events: [] }).events ?? []
    const e = matchOne(events.filter(e => !hidden.some(h => h.title === e.title && h.start === e.start)), x => x.title, a.match, 'calendar event')
    ctx.editJson('.brain/hidden.json', { events: [] }, h => ({ ...h, events: [...(h.events ?? []), { title: e.title, start: e.start }] }))
    return `Hide calendar event: "${short(e.title)}" (${prettyDate(e.start.slice(0, 10))}). Your Calendar app isn't changed.`
  },
  mark_email_handled(a, ctx) {
    const data = ctx.readJson('.brain/email.json', { items: [] })
    const m = matchOne((data.items ?? []).filter(i => !i.handled), i => `${i.from} ${i.subject} ${i.summary}`, a.match, 'email')
    ctx.editJson('.brain/email.json', { items: [] }, d => ({ ...d, items: d.items.map(i => (i.url === m.url && i.subject === m.subject ? { ...i, handled: true } : i)) }))
    return `Mark email handled: ${m.from}, "${short(m.subject, 50)}"`
  },
  add_application(a, ctx) {
    const id = `${a.company}-${a.role ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    ctx.editJson('.brain/applications.json', { items: [] }, d => {
      if (d.items.some(i => i.id === id)) throw new Error(`${a.company} is already in your tracker`)
      return { ...d, items: [...d.items, { id, company: a.company, role: a.role ?? '', stage: a.stage ?? 'saw', url: a.url ?? null, source: 'me', updated: ctx.today }] }
    })
    return describe(a)
  },
  move_application(a, ctx) {
    const items = ctx.readJson('.brain/applications.json', { items: [] }).items
    const it = matchOne(items, i => `${i.company} ${i.role}`, a.match, 'application')
    ctx.editJson('.brain/applications.json', { items: [] }, d => ({ ...d, items: d.items.map(i => (i.id === it.id ? { ...i, stage: a.stage, updated: ctx.today } : i)) }))
    return `Move ${it.company} (${short(it.role, 40)}) to ${a.stage}`
  },
  remove_application(a, ctx) {
    const items = ctx.readJson('.brain/applications.json', { items: [] }).items
    const it = matchOne(items, i => `${i.company} ${i.role}`, a.match, 'application')
    ctx.editJson('.brain/applications.json', { items: [] }, d => ({ ...d, items: d.items.filter(i => i.id !== it.id) }))
    return `Remove from tracker: ${it.company} (${short(it.role, 40)})`
  },
  create_note(a, ctx) {
    const exists = ctx.store.notes().some(p => norm(p.split('/').pop().replace(/\.md$/, '')) === norm(a.title))
    if (exists) throw new Error(`A note called "${a.title}" already exists`)
    ctx.edit(`${a.folder}/${a.title}.md`, () => newNote(a, ctx.today))
    return describe(a)
  },
  append_to_note(a, ctx) {
    const rel = noteByTitle(ctx.store, a.note)
    ctx.edit(rel, raw => appendToNote(raw, a.text))
    return describe(a)
  },
  remove_from_note(a, ctx) {
    const rel = noteByTitle(ctx.store, a.note)
    const raw = ctx.read(rel)
    const fm = raw.match(/^---[\s\S]*?---\n?/)?.[0] ?? ''
    const lines = raw.slice(fm.length).split('\n')
    const want = words(a.match)
    const hits = lines.map((l, i) => [l, i]).filter(([l]) => !/^#\s/.test(l) && want.every(w => words(l).join(' ').includes(w)))
    if (!hits.length) throw new Error(`Nothing in "${a.note}" matches "${a.match}"`)
    if (hits.length > 1) throw new Error(`"${a.match}" appears on ${hits.length} lines of "${a.note}". Be more specific.`)
    ctx.edit(rel, () => fm + lines.filter((_, i) => i !== hits[0][1]).join('\n'))
    return `Remove from [[${a.note}]]: "${short(hits[0][0].replace(/^\s*[-*]\s*/, ''))}"`
  },
  replace_in_note(a, ctx) {
    if (/visibility\s*:/i.test(a.find + a.replace)) throw new Error('Privacy settings are changed in the Privacy tab, not by the assistant')
    const rel = noteByTitle(ctx.store, a.note)
    const raw = ctx.read(rel)
    const fm = raw.match(/^---[\s\S]*?---\n?/)?.[0] ?? ''
    const body = raw.slice(fm.length)
    if (!body.includes(a.find)) throw new Error(`"${short(a.find, 40)}" isn't in "${a.note}"`)
    ctx.edit(rel, () => fm + body.replace(a.find, a.replace))
    return `In [[${a.note}]], change "${short(a.find, 40)}" to "${short(a.replace, 40)}"`
  },
  archive_note(a, ctx) {
    const rel = noteByTitle(ctx.store, a.note)
    if ([BRIEFING, 'Home.md', 'CLAUDE.md'].includes(rel) || rel.startsWith('05-Archive/')) throw new Error(`"${a.note}" can't be archived`)
    const to = `05-Archive/${rel.split('/').pop()}`
    ctx.moves.push([rel, to])
    ctx.touched.add(rel); ctx.touched.add(to)
    return `Archive [[${a.note}]] (moved to 05-Archive, not deleted)`
  },
  log_checkin(a, ctx) {
    const parsed = parseCheckin(a.text)
    if (!Object.keys(parsed).length) throw new Error(`Nothing to log in "${a.text}"`)
    ctx.editJson('.brain/checkins.json', { items: [] }, d => ({ ...d, items: [...d.items, { date: ctx.today, at: new Date().toISOString(), text: a.text, ...parsed }] }))
    return `Log: ${Object.entries(parsed).map(([k, v]) => (v === true ? k : `${k} ${v}`)).join(', ')}`
  },
  draft_email(a) {
    return describe(a) // opened in the browser by the dashboard; nothing is written or sent
  },
}

// Returns one result per action: { type, ok, said } or { type, ok: false, error }.
// When not a dry run, all writes happen only if every action resolved, so it's all or nothing.
export function applyActions(actions, store, { today, dryRun = false } = {}) {
  const pending = new Map() // rel → new text (staged; earlier actions are visible to later ones)
  const touched = new Set()
  const read = (rel) => (pending.has(rel) ? pending.get(rel) : store.read(rel))
  const moves = [] // [from, to], done after the writes
  const ctx = {
    store, today, dryRun, touched, read, moves,
    readJson: (rel, fb) => json({ read }, rel, fb),
    edit: (rel, fn) => { pending.set(rel, fn(read(rel))); touched.add(rel) },
    editJson: (rel, fb, fn) => { const next = fn(json({ read }, rel, fb)); pending.set(rel, JSON.stringify(next, null, 2) + '\n'); touched.add(rel) },
  }
  const results = actions.map(a => {
    try { return { type: a.type, ok: true, said: HANDLERS[a.type](a, ctx) } }
    catch (e) { return { type: a.type, ok: false, error: e.message } }
  })
  if (!dryRun && results.every(r => r.ok)) {
    for (const [rel, text] of pending) store.write(rel, text)
    for (const [from, to] of moves) store.move(from, to)
  }
  return { results, touched: [...touched], applied: !dryRun && results.every(r => r.ok) }
}

export const ACTION_TYPES = Object.keys(HANDLERS)
