export const TYPE_COLORS = {
  wiki: '#a78bfa',    // knowledge
  area: '#fb923c',    // areas of life
  project: '#34d399', // projects
  daily: '#60a5fa',   // daily notes (private only)
  inbox: '#94a3b8',
  note: '#e2e8f0',
}
export const TYPE_LABELS = { wiki: 'Knowledge', area: 'Area', project: 'Project', daily: 'Daily', inbox: 'Inbox', note: 'Note' }
export const colorFor = (type) => TYPE_COLORS[type] || TYPE_COLORS.note
