# notion-but-based
Notion Database View and Calendar with good UX and more colors

The app inside is called **Tagwerk**: a fast, iPhone-first task and calendar database with Table, Board, Calendar and List views, custom properties, 15+ option colors (plus a custom picker), conditional row colors and swipe gestures. It is a single HTML file, published as a Claude Artifact with a shared document database.

- `src/tagwerk.html`: the app
- `tests/smoke.js`: headless phone + desktop smoke test (`node tests/smoke.js`)
- `CLAUDE.md`: architecture, data model, conventions (read this first when working on the code)
- `.claude/skills/web-app-craft/`: general skill for building iPhone-first web apps (taste, patterns, pitfalls, reusable snippets, test template)

To use the skill in every Claude Code session, copy `.claude/skills/web-app-craft` to `~/.claude/skills/`.
