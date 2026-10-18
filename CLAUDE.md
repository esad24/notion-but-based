# Tagwerk: project guide for Claude

Tagwerk is the owner's personal task and calendar database: a Notion-style app with Table, Board, Calendar and List views, custom properties, option colors and conditional row colors, built as **one HTML file** and published as a Claude Artifact. It is used mostly on an **iPhone 17**.

Before changing UI or behavior, load the general skill in `.claude/skills/web-app-craft/` (`SKILL.md`, then `references/pitfalls.md`). This file covers only what is specific to this project.

## Quick facts
- Source: `src/tagwerk.html` (about 2,450 lines: CSS, HTML shell, one IIFE of vanilla JS, no libraries, no build step).
- Runtime: a Claude Artifact with capability `db` (shared document store). Live artifact: https://claude.ai/artifact/EXotYFsGPMVa3n1SxZcW58 (private to the owner).
- Local fallback: `localStorage` key `tagwerk:v2` (opens instantly, works without the database), last view in `tagwerk:vid`.
- Tests: `node tests/smoke.js` (headless Chromium: iPhone-size touch context and desktop; screenshots in `tests/out/`, which is git-ignored). Needs Playwright (`npm i playwright` or the preinstalled one at `/opt/node-tools/node_modules/playwright`).
- Syntax check: extract the `<script>` body and run `node --check` (see "Commands").

## Product rules (from the owner)
- Content views keep the Notion look; **settings and menus follow Apple iOS patterns** (grouped lists, sheets, switches, segmented controls).
- Phone first; fast and smooth; **one scroll axis at a time**; no pinned columns; the table header and rows scroll together horizontally; nothing under the screen edges (bottom bar, safe areas); the keyboard must never cover a field.
- Everything customizable: properties, types, options, colors (15 presets + custom), conditional row colors, views, groups, ordering, general settings.
- Dates have a start and an end, each with optional time. An empty time means all day. No "include time" switch.
- Gestures: pull a sheet down to close (or hide the keyboard), swipe right to go back, swipe list rows (right = complete, left = delete + Undo), swipe the calendar, press-and-hold + slide to reorder cards, board columns and settings lists.
- Data labels are German (status: Nicht begonnen / In Arbeit / Erledigt; priority: Sehr hoch / Hoch / Mittel-hoch / Mittel / Niedrig). All app UI text is English.

## Architecture

### File layout (`src/tagwerk.html`)
Top to bottom, searchable by these comment markers:
1. `<title>`, viewport meta, fonts link.
2. `<style>`: color tokens (`:root`, dark block twice), `#app`/header, `#view` scrollers, tags, `/* table */`, `/* board */`, `/* calendar */`, `/* page sheet */`, `/* menus: ... */` (grouped lists, switches, segmented controls, phone sheet rules in `@media (max-width:640px)`), `/* list view */` (swipe rows).
3. `<style id="colcss">` (generated column widths) and `<style id="cuscss">` (generated custom colors).
4. HTML shell: `.top` header (title row, `#searchbar`, `#vtabs`, `#chipbar`), `<main id="view">`, `#bbar` bottom bar, `#sheet` page sheet, `#mscrim`/`#menu`, `#toast`.
5. `<script>`, in order: helpers and icons, constants (`TYPES`, `COLORS`, `GROUPS`, `LAYOUTS`), `// ---------- defaults`, `state`, `dates`, `values`, `conditions`, `sorting`, `view helpers`, `persistence`, `mutations`, `schema mutations`, `rendering` (table, board, list, calendar), `page sheet`, `iOS-style gestures`, `menus`, `building blocks for menus and settings`, `editors`, `property menus`, `rule editors`, `view settings`, `toast`, `clicks`, `search`, `keyboard`, `column resize`, `drag & drop`, `boot`.

### Data model
Collections in the artifact database:
- `tasks/<id>`: `{title, body, created, updated, order, p:{<propId>: value}}`. Value types: select/status = option id; multi_select = `[ids]`; checkbox = `true`; number; text/url/email/phone = string; **date = `{d:'YYYY-MM-DD', t:'HH:MM', ed:'YYYY-MM-DD', e:'HH:MM'}`** (only `d` required; legacy values lack `ed`, then `e` belongs to day `d`; helpers `endDay`, `sameDay`, `lastDay`). Empty values are removed from `p`. Seed ids are `t01`..`t19`; new ids come from `newId()`.
- `meta/schema`: `{props:[{id,name,type,options?:[{id,name,color,group?}],fmt?}], colorRules:[{id,prop,op,val,color}], settings:{title,theme,time24,weekStart}}`. `title` is a built-in property. Default property ids: `title, priority, date, status, category, created, updated`; option ids for priority `sh,h,mh,m,n`, for status `nb,ia,er`; category option ids are slugs (`business, job, looks, ...`). Users can add more properties (ids `p<random>`).
- `meta/views`: `{views:[{id,name,type:'table'|'board'|'calendar'|'list', cols, hidden, filters:[{prop,op,val}], sorts:[{prop,dir}], widths, groupBy, hiddenGroups, hideEmpty, showNone, showCheck, dateProp, scope, wrap, density}]}`. Default ids: `board, table, cal, list`.
- Legacy: tasks written by earlier versions have flat fields (`status`, `priority`, `category`, `date`, `time`, `end`, `notes`); `migrateTask()` converts them on read. `meta/options` is a dead leftover.
- Colors: names in `COLORS` or custom `h-rrggbb`; CSS `.c-<name>` sets `--tbg/--tfg`; custom ones are generated into `#cuscss` by `customCss()` using `color-mix`.

### State and rendering
- Global `S = {tasks:Map, schema, views, vid, q, openId, drafts:Set, month, sel}`. `P(id)` property lookup, `V()` current view, `visible(view)` filters (search, view filters) and sorts.
- `render()` schedules one `requestAnimationFrame`; `renderNow()` rebuilds the current view via `innerHTML` (`renderTable`, `renderBoard`, `renderList`, `renderCalendar`), restores `scrollLeft` of `.hx` and `scrollTop` of `.vy`, and re-renders the open page sheet. Drag in progress defers rendering.
- Drafts: a new page lives in `S.drafts` until its title is non-empty and is not persisted or cached while a draft.

### Scrolling structure (do not change casually)
- `#view` scrolls vertically for calendar, list and board. The board has an inner `.hx` (horizontal).
- Table: `#view.v-table{overflow:hidden}` contains `.hx.tbx` (the **only** horizontal scroller, containing header and rows) containing `.tbl` (flex column) with `.tb-hw` (header) and `.vy` (rows, vertical scroll only). Widths come from `colCss()` into `#colcss` and apply to `.tr` and `.tb-h` explicitly (rows use `content-visibility:auto`).

### Persistence and sync (`persistence` section)
- `connect()` obtains `db` and subscribes to `tasks`, `meta/schema`, `meta/views`. Snapshots that only echo local writes are ignored by comparing `stable()` JSON; tasks with pending writes (`timers`, `busy`) or drafts are kept.
- Writes: `persist(id, delay)` debounces then `queueWrite(key, fn)` chains per key; `saveSchema()`/`saveViews()` debounce 350 ms; deletes via `persistDelete`. `cacheLocal()` writes the `localStorage` copy 400 ms after changes.
- Sync indicator (`#sync`, hidden text on phone): `saving`, `ok`, `local`, `error`.

### Properties, values, rules
- `getV(task, prop)` reads values (title, created, updated are special). `disp(prop, task)` returns the display HTML per type. `changeType()` converts stored values. `addProp/deleteProp/duplicateProp/addOption/deleteOption` keep schema, views and tasks consistent.
- Rules engine: `opsFor(type)`, `ruleReady(rule)`, `test(rule, task)`, `rowColor(task)` (first ready matching `colorRules`). Filters use the same `test`. An unfinished rule (blank value) does nothing; `closeMenu()` drops unfinished filters.

### Views
- **Table**: `shownProps(view)` columns, sort by header menu, resize handle `[data-rs]`, tinted rows by `rowColor`, `wrap` and `density` settings.
- **Board**: groups from `groupBy` options (`groupTasks`), cards show shown properties, drag cards between columns (`data-drop="grp:<id>"`), hold a column header to reorder (`colDrag`).
- **List**: Reminders style sections (optional grouping), rows are `.sw-row` (swipeable).
- **Calendar**: scopes month, week, 3day, day (`SCOPES`, `calRange`, `navCal`, `setScope`). Month grid on phone shows dots and an agenda list; week/3day/day use `renderTimeGrid` with overlap lanes (`layoutLanes`), now-line, drag to move (15 min snap), bottom handle to resize. Multi-day dates are placed on every covered day.
- Settings pages are objects `{title, wide?, tall?, render(container)}` shown by the menu stack: `settingsPage`, `generalPage`, `viewsPage`, `allPropsPage`, `propsVisPage`, `groupsPage`, `filtersPage`, `sortsPage`, `colorsPage`, `propPage`, `optionPage`, `datePage`, `pickerPage`, `textPage`, `addViewPage`, `trayPage`.

### Menus, sheets, gestures
- `openMenu/pushMenu/popMenu/closeMenu/dismissMenu/drawMenu/placeMenu`: one `#menu` element; popover on desktop, bottom sheet on phones; `MN.tall` makes it near full height while typing; `--kb` from `visualViewport` keeps content above the keyboard.
- `sheetGestures(panel, {scroller,onClose,back})` handles pull-down and back-swipe for both `#sheet` and `#menu`. Row swipes (`.sw-row`), calendar swipes and keyboard-hiding swipes are document-level touch listeners right after it.
- `sortable(list, onDone)` for grip reordering. Drag and drop (cards, rows, calendar entries, column headers) is in `// drag & drop`: mouse starts after 5 px, touch after a 360 ms hold, ghost clone, auto-scroll, drop kinds `grp`, `date`, `slot`, `allday`.

### Settings stored with the schema
`schema.settings`: `title` (header text), `theme` (system/light/dark, applied to `data-theme`), `time24`, `weekStart` (0 Sun, 1 Mon, 6 Sat). Helpers `ST()`, `setST()`, `applyST()`, `fmtT()`, `WS()`.

## Commands
```bash
# syntax check of the embedded script
python3 - <<'PY'
import re,sys
s=open('src/tagwerk.html').read()
open('/tmp/tagwerk-check.js','w').write(s.split('<script>')[1].rsplit('</script>',1)[0])
PY
node --check /tmp/tagwerk-check.js

# phone + desktop smoke test (screenshots in tests/out/, look at them)
node tests/smoke.js
```
Publishing (inside a Claude Code session with the Artifact tool): publish `src/tagwerk.html` to the existing artifact URL (`url` parameter) so the link stays the same; `capabilities` are carried forward (`db`). For small changes use the tool's `edits` (the old text must occur exactly once). Always read the live artifact first if it may have changed. Verify data with `ArtifactData` (`list` collection `tasks`, `get` `meta/schema`, `meta/views`). The user edits data and views while you work: re-read before any migration and pin writes with `if_version`.

## Conventions
- Single file, vanilla JS, no dependencies. Keep sections in the existing order and marker style.
- Match surrounding style: compact one-line handlers, `const`/arrow helpers, short comments only for non-obvious reasons.
- Escape user text with `h()` in every HTML string. Wrap `localStorage` in try/catch.
- New settings must be stored in `schema.settings` or the view object, exposed in the settings pages, and survive a reload.
- Each UI change: check phone (402x874) and desktop, light and dark, then run `node tests/smoke.js`.
- Do not put model identifiers in commits, code comments or files.

## Known limits and ideas
- Whole-view `innerHTML` rebuild; fine to about 1,000 tasks, hitches at a few thousand. Ideas: in-place row updates, virtualization, archive finished tasks, skip background re-render while typing in the sheet.
- Whole `tasks` collection is subscribed and mirrored in `localStorage` (about 5 MB limit); platform guidance is hundreds to low thousands of documents, hard cap 25,000.
- Not implemented: formulas, relations, rollups, "any of" filter groups, dragging table rows to reorder, forms, recurring tasks, reminders/notifications.
- Not verified on a real device: finger feel of gestures, iOS keyboard inside the Claude app, Safari-only rendering. Tests run in Chromium.
