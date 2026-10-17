// Small, pure edits to note text, used by the private dashboard's local API.
// File access and process spawning live in lib/local-api.js.

// A quick-capture note for 00-Inbox/. Named from the first words (or the link's site) so it's
// recognisable before the morning ingest files it properly.
export function captureNote(text, today) {
  const clean = text.trim()
  if (!clean) throw new Error('Nothing to capture')
  const url = clean.match(/^https?:\/\/\S+$/)?.[0]
  let title = url
    ? `Link from ${new URL(url).hostname.replace(/^www\./, '')}`
    : clean.split('\n')[0].replace(/[#*_`>[\]|\\/:?"<>]/g, '').split(/\s+/).slice(0, 7).join(' ')
  title = (title.charAt(0).toUpperCase() + title.slice(1)).trim().slice(0, 70) || 'Quick capture'
  return {
    title,
    content: `---\ntags: [inbox]\ncreated: ${today}\ntype: inbox\nvisibility: private\n---\n# ${title}\n\n${clean}\n`,
  }
}

// Avoid clobbering an existing note: "Idea" → "Idea 2" → "Idea 3"…
export function uniqueName(title, exists) {
  let name = title, n = 2
  while (exists(name)) name = `${title} ${n++}`
  return name
}

// Flip the checkbox of the Nth task line ("- [ ]" / "- [x]") in a note.
export function toggleTask(raw, index, done) {
  let i = -1
  const out = raw.split('\n').map(line => {
    if (!/^[\s>]*[-*] \[[ xX]\]/.test(line)) return line
    i++
    return i === index ? line.replace(/\[[ xX]\]/, done ? '[x]' : '[ ]') : line
  })
  if (i < index) throw new Error(`Task ${index} not found`)
  return out.join('\n')
}

// Set `visibility:` in a note's frontmatter, adding it if missing.
export function setVisibility(raw, visibility) {
  if (!['public', 'private'].includes(visibility)) throw new Error('visibility must be public or private')
  const m = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return `---\nvisibility: ${visibility}\n---\n${raw}`
  const fm = /^visibility:.*$/m.test(m[1])
    ? m[1].replace(/^visibility:.*$/m, `visibility: ${visibility}`)
    : `${m[1]}\nvisibility: ${visibility}`
  return raw.replace(m[0], `---\n${fm}\n---`)
}
