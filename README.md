# Arnav's Brain

A 3D, explorable map of my second brain: an Obsidian vault that an AI agent grows every morning.
Every glowing node is a note, colored by topic; every line is a link. Click a node to fly to it and
read it. **Live:** https://brain-site-three.vercel.app · **Demo video:** [/demo.mp4](https://brain-site-three.vercel.app/demo.mp4) · **How it's built:** [/case-study.html](https://brain-site-three.vercel.app/case-study.html)

On my laptop, the same brain is the center of a private app for my whole life: a morning briefing,
sorted email, deadlines, people, an internship tracker, health check-ins, files, feeds and spaced review.

Built with React, Vite, Tailwind, three.js ([react-force-graph-3d](https://github.com/vasturiano/react-force-graph)),
Obsidian, and Claude Code.

## How it works

```
 Gmail · Drive · GitHub · links ─┐                         ┌─► public site (Vercel): public notes only
 Mac Calendar/Reminders/Notes ───┼─► Claude /ingest ─► vault (git) ─► export + leak check
 folders · app data exports ─────┘   (every morning)       └─► private app (this laptop): everything
```

1. **Ingest.** Every morning a scheduled Claude agent runs `/ingest` in the vault: it reads email, Drive
   folders, GitHub repos, saved links and local sources, writes notes in my words, links them, updates the
   briefing, deadlines, people and tracker, and commits.
2. **Export.** `scripts/export-vault.js` turns the vault into graph data. The public export keeps only notes
   marked `visibility: public`, strips links to anything else, and refuses to publish if any private title or
   text slips through.
3. **Explore.** The public site is a static Vite build on Vercel. The private app runs on my laptop (or my phone,
   with a key) and adds a small local API that can run Claude Code, never send email, and undo any change.

## What's in it

**Public site**
- 3D brain with bloom, topic galaxies with floating labels, synapse pulses, hover previews, new notes that breathe
- **Take the tour** (a 60-second guided flight), **About me and my projects** (project cards, skills by depth)
- **Ask my brain**: answers from public notes only, with links (Vercel function; off until an API key is set)
- **Arrange by meaning**: pulls together notes that use similar words, even when they aren't linked
- Share links with a preview image per note (`/n/capm.html`), timeline replay, filters, ⌘K search, list view without 3D

**Private app** (`npm run dev:private`)
- **Brain home** with a time-aware day card: tasks (overdue tucked away, snooze to tomorrow), countdown, weather,
  calendar, reminders, and an evening wrap-up
- **Briefing, Inbox** (mark handled, Gmail drafts), **People** (who's waiting on you), **Career** (internship tracker),
  **Life** (areas, health charts, money, courses), **Feeds** (Instagram, TikTok, YouTube, Spotify, X, Reddit exports),
  **Files**, **Timeline** (every day across sources), **Review** (SM-2 spaced repetition, streaks, quizzes from notes)
- Command bar on every page: save a thought (Enter), ask or ask it to *do* something (⌘Enter, you approve each
  change), log health ("slept 7h, gym"), or speak
- Live: edits in Obsidian show up in seconds, new exports are read automatically, email is checked hourly
- Keyboard shortcuts (G then a letter), Mac notifications at 8am and 8pm, installable on a phone
- **Outlook / school email**: through a Microsoft 365 connector in the morning run, or from the Mac Mail app
- **Offline on your phone**: over Tailscale https, the phone keeps a read-only copy that opens even when the laptop is off

## Make your own brain

```bash
git clone https://github.com/arnav-616/brain-site && cd brain-site && npm install
npm run create-vault -- ../my-brain --name "Your Name"   # starter vault + points site.config.json at it
npm run dev:private                                       # your private app at http://localhost:5180
```

Then open `../my-brain` in Obsidian, and in Claude Code run `/ingest` inside it. Edit `site.config.json`
(name, tagline, site URL) and `<vault>/.brain/config.md` (email rules, Drive folders, news topics).
Deploy the public site to Vercel; set `ANTHROPIC_API_KEY` there to switch on **Ask my brain**.

**Add a source:** add an entry to `sources/index.js`. Local sources point at a script in `scripts/` that writes
`<vault>/.brain/<name>.json`; cloud sources are read by Claude during `/ingest` (describe them in
`.claude/commands/ingest.md`). Settings and Rescan pick it up automatically.

## Commands

| Command | What it does |
|---|---|
| `npm run dev:private` | The private app on this laptop (everything, including private notes) |
| `npm run dev:phone` then `npm run phone:link` | The private app on your phone (needs the one-time link with its key) |
| `npm run dev` | Preview the public site locally |
| `npm run export:public` | Rebuild public data and share cards from the vault (with the leak check) |
| `npm run notifications:install` / `:remove` | Mac notifications at 8:00 and 20:00 |
| `npm run create-vault -- <folder>` | Start a new vault from the template |
| `npm test` | Export, privacy, dashboard, assistant, importer and scheduling tests |
| `npm run test:ui` | Every page on desktop and phone sizes, plus an accessibility audit (needs both dev servers and Chrome) |

## How privacy works

- Only notes whose frontmatter says `visibility: public` are exported. Missing, broken or anything else means private.
- Links to private or unwritten notes are stripped from public notes, so private titles never appear.
- `export:public` runs a leak check and refuses to write if any private title or line is found. CI checks it again.
- Private data lives in `.private/` (gitignored) and is only served by the dev server. From any device other than
  this laptop, every request needs the phone key. Raw exports, the file index and Mac data are gitignored.
- The assistant can only read; changes happen when you press Apply, each one is a git commit, and Undo reverts it.
  Email is drafted, never sent.

## License

MIT. See `LICENSE`.
