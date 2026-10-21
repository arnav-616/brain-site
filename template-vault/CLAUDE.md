# Second Brain — Instructions for Claude

This folder is an Obsidian vault. It is my personal knowledge base ("second brain").
Your job is to help me capture, organize, connect, and resurface what I know.

## Structure
- `00-Inbox/` — raw, unprocessed captures. Anything goes. Process into other folders later.
- `01-Daily/` — daily notes, named `YYYY-MM-DD.md`.
- `02-Projects/` — things with a goal and an end date (e.g. "Build tracker app").
- `03-Areas/` — ongoing responsibilities with no end (e.g. Health, School, Career, Money).
- `04-Wiki/` — evergreen notes: one concept/person/tool/idea per note, written in my own words.
- `05-Archive/` — finished projects and stale stuff. Never delete; move here instead.
- `Templates/` — note templates. Don't edit unless asked.
- `Home.md` — the dashboard / entry point. It embeds `Today.md`, the latest morning briefing.
- `03-Areas/People/` — one private note per professional contact (from email).
- `04-Wiki/Sources/` — `type: source` summaries of docs, articles and links.
- `.brain/` — automation: `config.md` (my settings), `state.json` (progress), `log/` (run history).

## Automation
Every morning a scheduled Claude routine runs `/ingest`: it pulls professional Gmail, chosen Drive
folders, my GitHub repos and links dropped in the inbox, files them into notes, writes the briefing
to `Today.md`, commits, and republishes the public brain site. Settings live in `.brain/config.md`.

## Rules
- Use Obsidian `[[wikilinks]]` to link notes. Link generously — connections are the point.
- Before creating a note, search for an existing one on the same topic and update it instead.
- Note filenames: plain Title Case, no dates (except daily notes). e.g. `Spaced Repetition.md`.
- Every note starts with YAML frontmatter: `tags`, `created` (YYYY-MM-DD), and `type`
  (one of: daily, project, area, wiki, inbox, source).
- Wiki notes stay short and atomic. If a note covers two ideas, split it.
- Keep my voice. Don't pad with filler, don't invent facts I didn't give you.
  If you add outside info, mark it with a `> [!info] Added by Claude` callout.
- Never delete notes without asking. Moving to `05-Archive/` is fine when asked to clean up.
- When you change several notes, end with a short list of what you created/edited.

## Images
- When I paste an image (slides, screenshots, handwritten notes, textbook pages), transcribe the
  useful content into proper notes: formulas in LaTeX (`$...$`), tables as markdown tables.
- Pasted images aren't saved as files. If an image file exists in `Attachments/`, embed it in the
  relevant note with `![[filename.png]]`.

## Visibility (public brain website)
Every note's frontmatter must include `visibility: public` or `visibility: private`.
Only `public` notes appear on my public 3D brain website. **When unsure, use `private`.**

Always `private`:
- grades, GPA, test scores
- personal life (family, relationships, health, feelings, journaling)
- internship/job applications, recruiting, interviews, offers — and anything about them
- emails, work/professional correspondence, people's contact info
- anything embarrassing or that I wouldn't want a recruiter or stranger to read
- daily notes, weekly reviews, inbox notes

Usually `public`: learning/concept notes (e.g. finance concepts), project ideas I'd show off,
topic hub pages — as long as they contain none of the above.

If a public note would mention something private, keep the private part in a separate private note.
