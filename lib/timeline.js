// Everything that happened, grouped by day, newest first: notes, email, files, tasks, check-ins,
// calendar events and media. Pure: takes the dashboard data plus the git activity list.
const day = (iso) => (iso ? String(iso).slice(0, 10) : null)

export function timeline(graph, activity = {}, { days = 30, today } = {}) {
  const since = new Date(new Date(today + 'T12:00:00').getTime() - (days - 1) * 864e5).toLocaleDateString('en-CA')
  const events = []
  const add = (date, kind, text, extra = {}) => { const d = day(date); if (d && d >= since && d <= today) events.push({ date: d, kind, text, ...extra }) }

  graph.nodes.filter(n => !['daily', 'inbox'].includes(n.type)).forEach(n => add(n.created, 'note', n.title, { note: n.id }))
  ;(graph.email?.items ?? []).forEach(m => add(m.date, 'email', `${m.from}: ${m.subject}`, { url: m.url }))
  ;(graph.files?.recent ?? []).filter(f => f.kind !== 'project').forEach(f => add(f.modified, 'file', f.name))
  ;(activity.tasksDone ?? []).forEach(d => add(d, 'task', 'Finished a task'))
  ;(activity.captures ?? []).forEach(d => add(d, 'capture', 'Captured a thought'))
  ;(graph.checkins?.items ?? []).forEach(c => add(c.date, 'health', c.text))
  ;(graph.calendar?.items ?? []).filter(e => !/Holidays|Birthdays/.test(e.calendar)).forEach(e => add(e.start, 'event', e.title))
  ;(graph.social?.platforms ?? []).forEach(p => (p.recent ?? []).forEach(r => add(r.date, 'media', `${p.platform}: ${r.title}`, { url: r.url })))

  // Collapse repeats (e.g. 12 screenshots, 3 finished tasks) into one line per kind per day.
  const byDay = new Map()
  for (const e of events) {
    if (!byDay.has(e.date)) byDay.set(e.date, [])
    byDay.get(e.date).push(e)
  }
  return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, list]) => {
    const groups = {}
    list.forEach(e => (groups[e.kind] ??= []).push(e))
    return { date, groups }
  })
}
