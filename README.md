# Arnav's Brain

A 3D, explorable map of my second brain — an Obsidian vault maintained with Claude.
Each glowing node is a note; lines are links between them. Click a node to read it.

Built with React, Vite, Tailwind and [react-force-graph-3d](https://github.com/vasturiano/react-force-graph).

## Commands

| Command | What it does |
|---|---|
| `npm run dev:private` | My **full** brain, on my laptop only (includes private notes) |
| `npm run export:public` | Rebuild the public data from the vault (only `visibility: public` notes) |
| `npm run dev` | Preview the public version locally |
| `npm test` | Run the export + privacy tests |

The vault path defaults to `../second_project` (override with `VAULT_PATH=...`).

## How privacy works

- Only notes whose frontmatter says `visibility: public` are exported. Missing or anything else = private.
- Links to private or unwritten notes are stripped from public notes, so private titles never appear.
- `export:public` runs a leak check and refuses to write the file if any private title or text is found.
- The private graph lives in `.private/` (gitignored) and is only served by the dev server — never built or deployed.
