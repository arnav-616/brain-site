// The assistant proposes actions as a fenced ```actions JSON block at the end of its answer.
// These pure functions pull them out, validate them, and turn each into a file edit.
// Nothing here runs until you press Apply in the dashboard.

const DATE = /^\d{4}-\d{2}-\d{2}$/
const FOLDERS = ['00-Inbox', '02-Projects', '03-Areas', '03-Areas/People', '03-Areas/Courses', '04-Wiki', '04-Wiki/Sources']
const TYPES = ['inbox', 'project', 'area', 'wiki', 'source']

// Split the reply into the readable answer and a list of valid actions (invalid ones are dropped with a reason).
export function parseActions(reply = '') {
  const m = reply.match(/```actions\s*([\s\S]*?)```/)
  const answer = reply.replace(/```actions[\s\S]*?```/, '').trim()
  if (!m) return { answer, actions: [], rejected: [] }
  let list
  try { list = JSON.parse(m[1]) } catch { return { answer, actions: [], rejected: ['The proposed changes were not valid JSON.'] } }
  const actions = [], rejected = []
  for (const a of Array.isArray(list) ? list : []) {
    const why = validate(a)
    if (why) rejected.push(`${a?.type ?? 'unknown'}: ${why}`)
    else actions.push(a)
  }
  return { answer, actions, rejected }
}

function validate(a) {
  if (!a || typeof a !== 'object') return 'not an object'
  const str = (v) => typeof v === 'string' && v.trim().length > 0
  switch (a.type) {
    case 'add_task': return !str(a.text) ? 'needs text' : a.due && !DATE.test(a.due) ? 'bad date' : null
    case 'reschedule_task': return !str(a.match) ? 'needs the task text to match' : !DATE.test(a.due ?? '') ? 'bad date' : null
    case 'add_deadline': return !str(a.title) ? 'needs a title' : !DATE.test(a.date ?? '') ? 'bad date' : null
    case 'create_note': return !str(a.title) || /[/\\:]/.test(a.title) ? 'needs a plain title' : !FOLDERS.includes(a.folder) ? 'folder not allowed' : !TYPES.includes(a.noteType) ? 'bad note type' : !str(a.body) ? 'needs a body' : null
    case 'append_to_note': return !str(a.note) ? 'needs a note title' : !str(a.text) ? 'needs text' : null
    case 'draft_email': return !str(a.subject) || !str(a.body) ? 'needs a subject and body' : null
    default: return 'unknown action'
  }
}

// One human sentence per action, for the confirmation card.
export function describe(a) {
  switch (a.type) {
    case 'add_task': return `Add task "${a.text}"${a.due ? ` due ${a.due}` : ''} to today's list`
    case 'reschedule_task': return `Move "${a.match}" to ${a.due}`
    case 'add_deadline': return `Add deadline "${a.title}" on ${a.date}`
    case 'create_note': return `Create ${a.folder}/${a.title}.md (private)`
    case 'append_to_note': return `Add to [[${a.note}]]: "${a.text.slice(0, 80)}${a.text.length > 80 ? '…' : ''}"`
    case 'draft_email': return `Open a Gmail draft${a.to ? ` to ${a.to}` : ''}: "${a.subject}"`
    default: return a.type
  }
}

// Add a task line to the end of the briefing's "Needs you" section.
export function addTaskToBriefing(raw, text, due) {
  const line = `- [ ] ${text.trim()}${due ? ` 📅 ${due}` : ''}`
  const lines = raw.split('\n')
  const start = lines.findIndex(l => /^##\s.*needs you/i.test(l))
  if (start === -1) return `${raw.trimEnd()}\n\n## 🔥 Needs you today\n${line}\n`
  let end = start + 1
  while (end < lines.length && !/^##\s/.test(lines[end])) end++
  while (end > start + 1 && lines[end - 1].trim() === '') end--
  lines.splice(end, 0, line)
  return lines.join('\n')
}

// Index of the first open task whose text contains `match` (case-insensitive), for rescheduling.
export function findTask(raw, match) {
  let i = -1
  for (const line of raw.split('\n')) {
    if (!/^[\s>]*[-*] \[[ xX]\]/.test(line)) continue
    i++
    if (line.toLowerCase().includes(match.toLowerCase())) return i
  }
  throw new Error(`No task matching "${match}"`)
}

// A new note with proper frontmatter. Always private: anything public is a choice made in the Privacy tab.
export function newNote({ title, noteType, body }, today) {
  return `---\ntags: []\ncreated: ${today}\ntype: ${noteType}\nvisibility: private\n---\n# ${title}\n\n${body.trim()}\n`
}

export function appendToNote(raw, text) {
  return `${raw.trimEnd()}\n- ${text.trim().replace(/^[-*]\s+/, '')}\n`
}

// Gmail compose link with the draft filled in; you review and send it yourself.
export const gmailDraftUrl = ({ to = '', subject, body }) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
