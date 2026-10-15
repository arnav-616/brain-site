// Bioluminescent palette — topics get these in order of size, biggest first.
export const PALETTE = ['#5EEAD4', '#A78BFA', '#FBBF24', '#F472B6', '#7DD3FC', '#A3E635', '#FB923C', '#E879F9']

// Notes without a topic tag fall back to a color for their kind.
export const TYPE_COLORS = {
  wiki: '#A78BFA',
  source: '#7DD3FC',
  area: '#FB923C',
  project: '#34D399',
  daily: '#60A5FA',
  inbox: '#8A90B8',
  note: '#C7CCF0',
}
export const TYPE_LABELS = {
  wiki: 'Concept', source: 'Source', area: 'Area', project: 'Project', daily: 'Daily', inbox: 'Inbox', note: 'Note',
}

// topic → color, with the most-used topics getting the first colors.
export function topicColors(nodes) {
  const count = {}
  nodes.forEach(n => { if (n.topic) count[n.topic] = (count[n.topic] || 0) + 1 })
  const topics = Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b))
  return new Map(topics.map((t, i) => [t, PALETTE[i % PALETTE.length]]))
}

export const colorOf = (node, topics) =>
  (node.topic && topics.get(node.topic)) || TYPE_COLORS[node.type] || TYPE_COLORS.note
