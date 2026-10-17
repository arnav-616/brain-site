# Arnav's Brain

A 3D, explorable map of my second brain — an Obsidian vault maintained with Claude.
Each glowing node is a note, colored by topic; lines are links between them, and pulses of light
run along them like synapses firing. Click a node to fly to it and read it. **Watch it grow** replays
the brain in the order notes were written.

Every morning a scheduled Claude agent runs `/ingest` in the vault: it reads my professional email,
chosen Drive folders, my GitHub repos and links I've saved, files them into linked notes, writes a
private morning briefing, and republishes this site (only `visibility: public` notes).

Built with React, Vite, Tailwind and [react-force-graph-3d](https://github.com/vasturiano/react-force-graph).

## What's in it

**Public site** (what visitors see)
- 3D map with bloom, topic regions with floating labels, and synapse pulses along links
- **Take the tour**: a 60-second guided flight through the highlights
- **About me and my projects**: project cards (summary, stack, live link, code) and skills ranked by depth
- Shareable links: `/#/note/CAPM` opens that note directly
- Timeline replay, topic filters, ⌘K search, a list view when 3D isn't available

**Private dashboard** (`npm run dev:private`, laptop only)
- **Command bar**: Enter saves a thought or link to the inbox; ⌘Enter asks the brain a question
- **Hub**: Today (briefing with clickable tasks + deadlines in the next 2 weeks), Review (3 daily
  flashcards + notes worth another look), Health (unwritten links, orphans, thin notes),
  Privacy (what's public, one-click flip), Runs (ingest history)
- One-click **Refresh briefing**, **Tidy inbox**, and **Undo last change** (every change is a git commit)

The dashboard runs Claude Code locally through a small dev-server API (`lib/local-api.js`). It only
accepts requests from this page, can draft but never send email, and is never part of the public build.

## Commands

| Command | What it does |
|---|---|
| `npm run dev:private` | My **full** brain plus today's briefing, on my laptop only (includes private notes) |
| `npm run export:public` | Rebuild the public data from the vault (only `visibility: public` notes) |
| `npm run dev` | Preview the public version locally |
| `npm test` | Run the export, privacy, dashboard and showcase tests |

The vault path defaults to `../second_project` (override with `VAULT_PATH=...`).

## How privacy works

- Only notes whose frontmatter says `visibility: public` are exported. Missing or anything else = private.
- Links to private or unwritten notes are stripped from public notes, so private titles never appear.
- `export:public` runs a leak check and refuses to write the file if any private title or text is found.
- The private graph lives in `.private/` (gitignored) and is only served by the dev server — never built or deployed.
