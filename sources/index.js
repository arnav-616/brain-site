// Every place the brain gets data from. To add a source, add an entry here:
//   kind: 'local'  → a script in scripts/ that writes .brain/<something>.json (runs on Rescan and in `live`)
//   kind: 'cloud'  → read by Claude during the morning /ingest (describe it in .claude/commands/ingest.md)
//   status(graph)  → { ok, text } for the Settings page, from the exported dashboard data
const ago = (iso) => {
  if (!iso) return null
  const d = Math.round((Date.now() - new Date(iso)) / 864e5)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

export const SOURCES = [
  { id: 'gmail', name: 'Gmail', kind: 'cloud', about: 'Work, school and personal mail, sorted. Drafts replies, never sends.',
    status: g => ({ ok: !!g.state?.gmail?.lastRun, text: g.state?.gmail?.lastRun ? `Checked ${ago(g.state.gmail.lastRun)}` : 'Not checked yet' }) },
  { id: 'outlook', name: 'Outlook & school email', kind: 'cloud',
    about: 'Connect Microsoft 365 in claude.ai → Connectors (read in the morning run), or add the account in Mac System Settings → Internet Accounts (read from the Mail app).',
    status: g => {
      const n = g.mailLocal?.items?.length ?? 0, accounts = [...new Set((g.mailLocal?.items ?? []).map(m => m.account))]
      const fromOutlook = (g.email?.items ?? []).some(i => /outlook|microsoft|illinois\.edu/i.test(i.account ?? ''))
      return n || fromOutlook ? { ok: true, text: n ? `${n} recent messages from ${accounts.join(', ')}` : 'In the morning run' } : { ok: false, text: 'Not connected yet' }
    } },
  { id: 'github', name: 'GitHub', kind: 'cloud', about: 'Your repos become project notes and portfolio cards.',
    status: g => ({ ok: !!g.state?.github?.lastRun, text: g.state?.github?.lastRun ? `Checked ${ago(g.state.github.lastRun)}` : 'On next refresh' }) },
  { id: 'drive', name: 'Google Drive', kind: 'cloud', about: 'Lecture slides and docs become notes, formulas in LaTeX. Folders in .brain/config.md.',
    status: g => ({ ok: !!g.state?.drive?.lastRun, text: g.state?.drive?.lastRun ? `Checked ${ago(g.state.drive.lastRun)}` : 'Add folder names in .brain/config.md' }) },
  { id: 'news', name: 'News & weather', kind: 'cloud', about: 'World, markets, tech in the briefing; live weather on the home card.',
    status: g => ({ ok: !!g.state?.lastBriefing, text: g.state?.lastBriefing ? `In the ${g.state.lastBriefing} briefing` : 'On next refresh' }) },
  { id: 'folders', name: 'Folders', kind: 'local', script: 'scripts/index-files.js', about: 'Recent files in Desktop, Documents and Downloads (names and dates only).',
    status: g => ({ ok: !!g.files, text: g.files ? `${g.files.total} files, indexed ${ago(g.files.updated)}` : 'Not indexed yet' }) },
  { id: 'exports', name: 'App exports', kind: 'local', script: 'scripts/import-exports.js', about: 'Instagram, TikTok, YouTube, Spotify, X, Reddit from their data downloads.',
    status: g => ({ ok: !!g.social?.platforms?.length, text: g.social?.platforms?.length ? g.social.platforms.map(p => p.platform).join(', ') : 'None yet (see Feeds)' }) },
  { id: 'apple', name: 'Mac Calendar, Reminders & Notes', kind: 'local', script: 'scripts/read-apple.js', about: 'Events, open reminders and recently edited notes from your Mac.',
    status: g => {
      const err = g.calendar?.error || g.reminders?.error
      return { ok: !!g.calendar && !err, text: err ? `Blocked: ${err}` : g.calendar ? `${g.calendar.items.length} upcoming events, ${g.reminders?.items.length ?? 0} reminders` : 'Not read yet' }
    } },
  { id: 'gcal', name: 'Google Calendar', kind: 'cloud', about: 'Connect it in claude.ai → Settings → Connectors, or add Google to the Mac Calendar app.',
    status: () => ({ ok: false, text: 'Not connected' }) },
]

export const LOCAL_SCRIPTS = SOURCES.filter(s => s.kind === 'local').map(s => s.script)
