Run the brain's daily ingestion and write my morning briefing. This runs unattended every morning
(and I can run it by hand). This is my whole-life hub: school, career, projects, money, health, social. Follow `CLAUDE.md` for every note you touch — frontmatter, `visibility`,
wikilinks, my voice, search before creating. **When unsure about visibility, use `private`.**

Settings: `.brain/config.md`. Progress: `.brain/state.json` (only fetch things newer than `lastRun`;
if `lastRun` is null, look back 3 days). Today = the current date in the configured timezone.

Extra instructions from me (may be empty): $ARGUMENTS

## 1. Gather
Do each source independently — if one fails (connector missing, auth error), note it in the log and
move on. Never stop the whole run because of one source.

- **Gmail** — search threads since `gmail.lastRun`, keep only professional mail per the config.
  For each meaningful thread: update or create a note for the person/org in `03-Areas/People/`
  (name, role, how I know them, running log of interactions — no phone numbers or addresses),
  and for anything with real substance (an opportunity, a project, a decision) a note in the
  right place (`02-Projects/`, `03-Areas/Career.md`, etc.). All of it `visibility: private`.
  Never copy whole emails; summarize in a line or two.
  **Reply drafts:** for threads where someone is waiting on *me*, create a Gmail **draft** reply
  (`create_draft`, in the same thread) in my voice: short, friendly, no promises I haven't made. Never
  send anything. Mention it in the briefing as "draft ready in Gmail".
  **Deadlines:** any due date, interview time, form deadline, or event I need to act on → add to the deadline list (see step 3).
  **Inbox page:** overwrite `.brain/email.json` with what you kept from the last 7 days:
  `{"updated": ISO time, "scanned": N, "skipped": "what you left out", "items": [{"date": "YYYY-MM-DD",
  "category": "action|school|project|opportunity|update|personal", "from": "...", "subject": "...",
  "summary": "one line: what it is and what to do", "url": "the thread's Gmail viewUrl",
  "note": "related note title or omit", "draft": true if you drafted a reply,
  "person": true if an individual wrote it (not a company, service, alert or newsletter)}]}`. Most urgent first
  within each category. Collapse repeats (e.g. 20 job alerts → one item listing the best ones).
- **Folders & app exports** — in the brain-site repo, run `node scripts/index-files.js` and
  `node scripts/import-exports.js` (both read paths from the vault). Then look at `.brain/files.json`:
  new lecture PDFs/slides/docs in the last day → make source notes (same rules as Drive). Look at
  `.brain/social.json`: if a platform's data is new, update a private `03-Areas/Social.md` with the
  highlights (top artists, channels, saved posts worth turning into notes). Never publish any of it.
- **Google Drive** — only the folders listed in the config. For new/changed files (compare with
  `drive.seen`, keyed by file id → modified time): make a `type: source` note in `04-Wiki/Sources/`
  summarizing it, and split each key concept into its own short atomic `04-Wiki/` note (update
  existing ones instead of duplicating). Learning material → `public`; anything else → `private`.
  Lecture slides / PDFs: transcribe the useful content like my CAPM lecture note — formulas in LaTeX
  (`$...$`), tables as markdown tables, worked examples kept. Syllabi → add their due dates as deadlines.
- **GitHub** — `gh repo list <account from .brain/config.md> --json name,description,visibility,primaryLanguage,updatedAt,url`.
  For each repo updated since last run (skip ones in the config): read the README and recent commit
  messages, then create/update `02-Projects/<Repo Title>.md` (what it is, stack, status, recent work,
  link to the repo). Fill the project-card frontmatter the website shows: `summary` (one sentence),
  `stack` (list), `repo` (GitHub URL, only if the repo is public), `url` (live site/homepage, if any),
  `status` (active / shipped / paused). Public repo → `public` (unless it's about recruiting/applications); private repo → `private`.
  Link projects to wiki notes for the tools/concepts they use.
- **Inbox** — process every note in `00-Inbox/` (except `Welcome.md`): move/merge it into the right
  place. Bare URLs or notes that are mostly a link: fetch the page and make a `type: source` note in
  `04-Wiki/Sources/` with a short summary, key ideas as links, and the URL. YouTube/podcast links:
  summarize from the transcript or description if you can get it; if not, say so — never guess the
  content. PDFs or images in `Attachments/` referenced from the inbox: transcribe like Drive lectures.
  Don't ask for approval — this is the unattended version of `/process-inbox`. Never delete; if
  unsure, leave it in the inbox.
- **Calendar** — if a Google Calendar connector is available, read today's events for the briefing.
  Otherwise use `.brain/calendar.json` (read from the Mac's Calendar app by `node scripts/read-apple.js`
  in the brain-site repo, when running on the laptop).
- **Mac Reminders & Notes** — `.brain/reminders.json`: open reminders due within 3 days go into
  "Needs you" (with 📅 dates). `.brain/apple-notes.json`: notes edited since the last run that hold
  real knowledge (class notes, ideas, plans) become inbox notes, then get filed like any other capture.
- **Internship tracker** — keep `.brain/applications.json` (`{"items":[{"id","company","role","stage":
  "saw|applied|interview|offer|closed","url","source","updated"}]}`) current: the 3–5 best new openings
  from job alerts as `saw` (skip ones already there); "thank you for applying" emails → `applied`;
  interview invites → `interview` (also add the interview to deadlines); offers → `offer`; rejections → `closed`.
  Never move an item backwards that I moved forward myself.
- **Money** — rent, tuition, bills and subscriptions from email → `.brain/money.json`
  (`{"updated","bills":[{"title","amount","due","paid"}],"months":[{"month","spent"}]}`). Amounts only
  when the email states them. Always private.
- **Courses** — when lecture slides, a syllabus or class emails mention a course, keep one note per
  course in `03-Areas/Courses/<Code Name>.md` (tags: [course, school]) linking its lectures and listing
  due dates (also added to deadlines). Link each course from [[School]].
- **People** — for anyone who emailed me personally (not alerts or newsletters), keep a short private
  note in `03-Areas/People/<Full Name>.md` and set the email item's `note` to that name.

## 2. Connect
Look over everything created/edited this run: add `[[wikilinks]]` to related existing notes (both
directions where it makes sense), and link new notes from the relevant `03-Areas/` hub page.
- **Auto-link:** for each note title in the vault, find plain-text mentions in other notes and turn the
  first mention per note into a `[[link]]` (skip daily notes, code, and formulas; don't link a note to itself).
- **Upkeep check (don't fix, just report):** notes that cover two ideas (should be split), two notes on
  the same idea (should be merged), and topics with 3+ notes but no `03-Areas/` hub. List them under
  "🧹 Upkeep" in the briefing so I can decide.

## 3. Morning briefing
Write the briefing to **`Today.md`** at the vault root (overwrite it), and also insert the same
content as a `## Morning Briefing` section at the top of today's daily note `01-Daily/YYYY-MM-DD.md`
(create it from `Templates/Daily.md` if missing; replace the section if it already exists).

`Today.md` format:

```markdown
---
tags: [briefing]
created: YYYY-MM-DD
type: daily
visibility: private
---
# Briefing — Weekday, Month D

## 🔥 Needs you today
- [ ] Reply to [[Person]] about X 📅 2026-10-22      ← real action items, most urgent first; add 📅 YYYY-MM-DD when there's a deadline
## ✉️ Email
- **[[Org or Person]]** — one-line summary            ← grouped, ⚠️ prefix if urgent
## 📅 Calendar
- 10:00 Thing                                         ← or "Calendar not connected" if unavailable
## 🌍 World
> [!info] Added by Claude
> - **Headline** — one-sentence why it matters. ([Source](url))
## 📈 Markets & finance   (one section per topic in the config, same callout format)
## ⏰ Coming up
- **Fri Oct 23** — Problem set 5 due ([[Course]])       ← next 14 days from the deadline list
## 🧠 Brain updates
- New: [[Note]], [[Note]] · Updated: [[Note]]
- 💡 Connection: [[A]] ↔ [[B]] — why
## 🧹 Upkeep
- [[Note]] covers two ideas — split into X and Y?       ← omit the section if there's nothing
```

**Deadline list:** keep `.brain/deadlines.json` up to date — a JSON array of
`{"date": "YYYY-MM-DD", "title": "...", "note": "Note title or null", "source": "gmail|drive|inbox|me", "done": false}`.
Add new ones, mark `done: true` when an email/note shows it's handled, and drop entries more than 7
days past. Never duplicate an existing entry (same title + date).

**Sundays:** also write the weekly digest to `01-Daily/Weekly Review YYYY-MM-DD.md` following
`/weekly-review` steps 1–3 (wins, what I worked on, themes; stalled projects; 3 unlinked connections),
plus 3 reflection questions for me to answer later. Link it from the briefing.

**Task format (the dashboard depends on it):** one task per line, `- [ ] what to do`. If it has a
deadline, end the line with `📅 YYYY-MM-DD` — never write the deadline in words ("due Friday",
"deadline was Oct 13"). No ⚠️ or other emoji at the start of a task; urgency comes from order and dates.
Tasks: carry over unfinished "Needs you" items from yesterday's briefing (keep their 📅 date). Drop an
item once it's done, or once it's more than 7 days past its date with no sign it still matters.
News: use web search for today's top stories; keep it factual, sourced, no padding. Empty sections
say "Nothing new." Keep the whole briefing scannable in under 2 minutes.

## 4. Save & publish
1. Update `.brain/state.json` (lastRun timestamps = now, seen files/repos, `lastBriefing`).
2. Append a run summary to `.brain/log/YYYY-MM.md`: date, counts per source, notes created/edited,
   errors.
3. `git add -A && git commit -m "Nightly ingest YYYY-MM-DD"` and push.
4. If the brain-site repo is available (at `../brain-site` or `$BRAIN_SITE`): run
   `npm test && npm run export:public` there (run `npm ci` first only if `node_modules/` is missing). If the export succeeds and
   `public/data/graph.json` changed, commit "Update brain YYYY-MM-DD" and push (this redeploys the
   site). If the leak check refuses, **do not publish** — put the reasons at the top of `Today.md`
   under "⚠️ Publish blocked" and in the log.

Finish with a short summary of what changed.
