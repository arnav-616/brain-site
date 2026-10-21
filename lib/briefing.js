// Splits the morning briefing (Today.md body) into its "## " sections so the dashboard can lay
// them out as cards. Each section knows how many task checkboxes come before it, so a checkbox
// inside a card maps back to the right line of the file.
const TASK = /^[\s>]*[-*] \[[ xX]\]/

export function parseBriefing(body = '') {
  const lines = body.split('\n')
  const title = lines.find(l => /^#\s/.test(l))?.replace(/^#\s+/, '') ?? 'Today'
  const sections = []
  let current = null, tasksBefore = 0
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/)
    if (h) {
      if (current) sections.push(current)
      const [, emoji, name] = h[1].match(/^(\p{Extended_Pictographic}️?)?\s*(.*)$/u)
      current = { key: name.toLowerCase(), title: name, emoji: emoji ?? '', body: '', taskOffset: tasksBefore }
      continue
    }
    if (TASK.test(line)) tasksBefore++
    if (current) current.body += line + '\n'
  }
  if (current) sections.push(current)
  sections.forEach(s => { s.body = s.body.trim() })
  return { title, sections }
}

// Finds the section whose title starts with any of the given words (case-insensitive).
export const section = (parsed, ...names) =>
  parsed.sections.find(s => names.some(n => s.key.startsWith(n.toLowerCase())))

// Tasks in a section, in file order. A due date is written Obsidian-Tasks style: "📅 2026-10-13".
// `index` counts every task in the section, matching how toggleTask counts lines.
export function parseTasks(body = '', today) {
  const tasks = []
  for (const line of body.split('\n')) {
    const m = line.match(/^[\s>]*[-*] \[([ xX])\]\s*(.*)$/)
    if (!m) continue
    const due = m[2].match(/📅\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
    tasks.push({
      index: tasks.length,
      done: m[1] !== ' ',
      text: m[2].replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/, '').trim(),
      due,
      overdue: !!(due && today && due < today && m[1] === ' '),
      later: !!(due && today && due > today && m[1] === ' '), // snoozed, or not due yet
    })
  }
  return tasks
}
