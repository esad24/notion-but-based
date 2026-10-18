# Tagwerk: project guide for Claude

Tagwerk is the owner's personal task and calendar database: a Notion-style app with Table, Board, Calendar and List views, custom properties, option colors and conditional row colors. It ships as **one HTML file** published as a Claude Artifact and is used mostly on an **iPhone 17**.

Before changing UI or behavior, load the general skill in `.claude/skills/web-app-craft/` (`SKILL.md`, then `references/pitfalls.md`). This file covers only what is specific to this project.

## Quick facts
- Source: small files in `src/` (vanilla JS + CSS, no libraries). `node build.js` stitches them into **`dist/tagwerk.html`**, the file that gets published. `dist/` is git-ignored; never edit it.
- Runtime: a Claude Artifact with capability `db` (shared document store). Live artifact: https://claude.ai/artifact/EXotYFsGPMVa3n1SxZcW58 (private to the owner).
- Local fallback: `localStorage` key `tagwerk:v2` (opens instantly, works without the database), last view in `tagwerk:vid`.
- Tests: `node tests/smoke.js` builds, then drives the app in headless Chromium (iPhone-size touch context and desktop). Prints `ok`/`FAIL` per check, exits 1 on failure, screenshots in `tests/out/`. Touch gestures that need real pointer events (hold and slide) go through CDP `Input.dispatchTouchEvent` (`touchDrag`). Needs Playwright (`npm i playwright` or the preinstalled one at `/opt/node-tools/node_modules/playwright`).

## Product rules (from the owner)
- Content views keep the Notion look; **settings and menus follow Apple iOS patterns** (grouped lists, sheets, switches, segmented controls).
- Phone first; fast and smooth; **one scroll axis at a time**; no pinned columns; the table header and rows scroll together horizontally; nothing under the screen edges (bottom bar, safe areas); the keyboard must never cover a field.
- Everything customizable: properties, types, options, colors (15 presets + custom), conditional row colors, views, groups, ordering, general settings.
- Dates have a start and an end, each with optional time. An empty time means all day. No "include time" switch.
- Gestures: pull a sheet down to close (or hide the keyboard), swipe right to go back, swipe list rows (right = complete, left = delete + Undo), swipe the calendar, press-and-hold + slide to reorder cards, board columns and settings lists.
- Data labels are German (status: Nicht begonnen / In Arbeit / Erledigt; priority: Sehr hoch / Hoch / Mittel-hoch / Mittel / Niedrig). All app UI text is English.

## Commands
```bash
node build.js        # src/ -> dist/tagwerk.html; fails on a JS syntax error (prints the line) or a src file not included anywhere
node tests/smoke.js  # build + phone/desktop checks; look at the screenshots in tests/out/ after UI changes
```
`npm run build` and `npm test` do the same.

## How the build works
- `src/tagwerk.html` is the entry: `<head>` bits, one `<style>` with include lines, the HTML shell, and one `<script>` with an IIFE whose body is include lines.
- An include line is a whole line holding only a comment: `/* @include styles/x.css */` or `// @include js/x.js` (paths relative to `src/`). Nothing else is transformed.
- **Order matters.** CSS files are included in cascade order (later files win ties). JS files share one scope and run top to bottom: functions are hoisted, but `const`/`let` used by top-level code (event listener setup, `boot.js`) must come from an earlier file.
- To add a file: create it with a one-line header comment, add its include line in the right place in `src/tagwerk.html`. The build refuses orphan files.

## Where things live
Every file starts with a one-line comment describing it (`head -1 src/js/*.js src/styles/*.css`).

### `src/js/` (load order)
| File | What it holds |
|---|---|
| `util.js` | `$`, `h()` HTML escape, `narrow()` phone layout, `svg`, `clone`, `stable`, `cap`, `newId` |
| `icons.js` | `IC` UI icons, `TI` property type icons |
| `constants.js` | `TYPES`, `HAS_OPTS`, `GROUPABLE`, `IS_DATEISH`, `COLORS`, `GROUPS`, `FORMATS`, `LAYOUTS`, `DEF_W` |
| `defaults.js` | `defaultSchema()`, `defaultViews()` |
| `state.js` | `S`, `P(id)`, `V()`, `opt`, `statusProp`, `isGroupProp`, `firstPropId`, `groupOpt` |
| `dates.js` | date keys, `toMin/fromMin`, cached `fmt()` Intl formatters, memoized `relDate`, `dateLabel`, `endDay/sameDay/lastDay`, `durOf`, `weekStart` |
| `settings.js` | `ST()`, `setST()`, `applyST()`, `fmtT()`, `WS()` |
| `values.js` | `getV`, `isEmpty`, `fmtNum`, `safeUrl`, `tagO`, `isDone`, `disp` |
| `conditions.js` | `OPS`, `opsFor`, `ruleReady`, `test`, `rowColor`, `condLabel` |
| `sorting.js` | `sk`, `comparator` |
| `view-helpers.js` | `viewProps`, `shownProps`, `visible` |
| `persistence.js` | cache, `persist`, `queueWrite`, `saveSchema/saveViews`, sync indicator, `migrateTask`, `connect` |
| `mutations.js` | `update` (`quiet` = re-render the view only after typing pauses), `setVal`, `restore`, `createTask`, `removeTask`, `toggleDone` |
| `sample-data.js` | `sampleTasks()` (~700 realistic pages around today, `demo:true`), `addSamples`, `removeSamples` |
| `schema.js` | `addOption`, `changeType`, `addProp`, `deleteProp`, `duplicateProp`, `deleteOption`, `customCss` |
| `render.js` | `render`, `renderLater`, `renderNow`, `renderBar`, `emptyState`, `groupTasks`, `setGroupOrder`, paging (`pageOf`, `moreBtn`, `showMore`) |
| `render-table.js` / `render-board.js` / `render-list.js` / `render-calendar.js` | one view each (`rowHtml` lives in list, `evHtml`/time grid in calendar) |
| `sheet.js` | page sheet: `openSheet`, `closeSheet`, `renderSheet` |
| `gestures.js` | `sheetGestures`, row swipes, keyboard hiding, calendar swipes |
| `menu.js` | menu stack `MN`, `openMenu/pushMenu/popMenu/closeMenu/dismissMenu/drawMenu/placeMenu` |
| `sortable.js` | `sortable(list, onDone)`: hold a row (or grab the grip) and slide, animated, auto-scrolls; `sorting` state |
| `ui-blocks.js` | grouped-list builders (`grp`, `linkCell`, `actCell`, `tglCell`, `segCell`, `selCell`, `fldCell`), `bindControls` |
| `editors.js` | `openEditor`, `textPage`, `pickerPage`, `optionPage`, `colorGrid`, `datePage` |
| `prop-menus.js` | `propPage`, `typePage`, `newPropPage` |
| `rule-editors.js` | `filtersPage`, `sortsPage`, `colorsPage` |
| `settings-pages.js` | `settingsPage`, `generalPage`, `viewsPage`, `allPropsPage`, `propsVisPage`, `groupsPage`, `addViewPage`, `addGroupPage`, `trayPage`, `setLayout` |
| `toast.js` | `toast(msg, undo)` |
| `input.js` | delegated click handler (`data-act` values), search, keyboard shortcuts, `swallowClick` |
| `resize.js` | table column resize, all-day area resize (`rsz`) |
| `drag.js` | drag & drop: cards, list and table rows, table headers, board columns, calendar entries |
| `boot.js` | startup |

### `src/styles/` (cascade order)
`tokens.css` (+ `tokens-dark.css`, included twice) · `base.css` (shell, header, bottom bar) · `values.css` (tags, dates, checkboxes, empty states) · `table.css` · `board.css` · `calendar.css` · `sheet.css` · `menus.css` · `list.css` · `toast.css` · `drag.css` · `motion.css`. Each file keeps its own `@media (hover:hover)` and `@media (max-width:640px)` (phone) rules at its end.

### Common changes
- **New view setting**: store it on the view object, add a control in `settingsPage` (`settings-pages.js`) with a `ui-blocks.js` builder + `bindControls`, read it in the view's `render-*.js`.
- **New app setting**: add a default in `ST()` (`settings.js`), a control in `generalPage`, use it where needed.
- **New property type**: `TYPES`/`DEF_W` (`constants.js`), icon in `TI`, then `disp` (`values.js`), `opsFor`/`test` (`conditions.js`), `sk` (`sorting.js`), `convertVal` (`schema.js`), `openEditor` (`editors.js`).
- **New button action**: give the element `data-act="name"` and handle it in the click handler in `input.js` (clicks inside `#menu` are handled by the menu page itself).
- **New settings page**: an object `{title, wide?, tall?, render(container)}`; open with `openMenu(anchor, page)` or `pushMenu(page)`.

## Data model
Collections in the artifact database:
- `tasks/<id>`: `{title, body, created, updated, order, p:{<propId>: value}, demo?}` (`demo:true` marks sample pages; ids `sx0000`..). Value types: select/status = option id; multi_select = `[ids]`; checkbox = `true`; number; text/url/email/phone = string; **date = `{d:'YYYY-MM-DD', t:'HH:MM', ed:'YYYY-MM-DD', e:'HH:MM'}`** (only `d` required; legacy values lack `ed`, then `e` belongs to day `d`; helpers `endDay`, `sameDay`, `lastDay`). Empty values are removed from `p`. Seed ids are `t01`..`t19`; new ids come from `newId()`.
- `meta/schema`: `{props:[{id,name,type,options?:[{id,name,color,group?}],fmt?}], colorRules:[{id,prop,op,val,color}], settings:{title,theme,time24,weekStart}}`. `title` is a built-in property. Default property ids: `title, priority, date, status, category, created, updated`; option ids for priority `sh,h,mh,m,n`, for status `nb,ia,er`; category option ids are slugs (`business, job, looks, ...`). Users can add more properties (ids `p<random>`).
- `meta/views`: `{views:[{id,name,type:'table'|'board'|'calendar'|'list', cols, hidden, filters:[{prop,op,val}], sorts:[{prop,dir}], widths, groupBy, hiddenGroups, hideEmpty, showNone, nonePos, showCheck, showDone, dateProp, scope, allDay:{open,h}, wrap, density}]}`. `nonePos` = index in the group property's options where the "No <property>" group sits; `showDone:false` hides completed pages (default for new List views); `allDay` = time grid all-day area expanded and its height in px. Default ids: `board, table, cal`; views added later get `newId()` ids.
- Legacy: tasks written by earlier versions have flat fields (`status`, `priority`, `category`, `date`, `time`, `end`, `notes`); `migrateTask()` converts them on read. `meta/options` is a dead leftover.
- Colors: names in `COLORS` or custom `h-rrggbb`; CSS `.c-<name>` sets `--tbg/--tfg`; custom ones are generated into `#cuscss` by `customCss()` using `color-mix`.

## Runtime behavior
### State and rendering
- Global `S = {tasks:Map, schema, views, vid, q, openId, drafts:Set, month, sel, more}`. `visible(view)` applies search, Show completed and view filters, then sorts.
- Paging: tables render 150 rows, board columns and list groups 60, then a "Show more" button (`S.more[viewId:group]`) that an IntersectionObserver clicks when it scrolls near. Keeps a full database (~700+ pages) at about 10-25 ms per render in the headless test.
- `render()` schedules one `requestAnimationFrame`; `renderNow()` rebuilds the current view via `innerHTML`, restores `scrollLeft` of `.hx` and `scrollTop` of `.vy`, and re-renders the open page sheet. A drag in progress defers rendering.
- Drafts: a new page lives in `S.drafts` until its title is non-empty and is not persisted or cached while a draft.

### Scrolling structure (do not change casually)
- `#view` scrolls vertically for calendar, list and board. The board has an inner `.hx` (horizontal).
- Table: `#view.v-table{overflow:hidden}` contains `.hx.tbx` (the **only** horizontal scroller, containing header and rows) containing `.tbl` (flex column) with `.tb-hw` (header) and `.vy` (rows, vertical scroll only). Widths come from `colCss()` into `#colcss` and apply to `.tr` and `.tb-h` explicitly (rows use `content-visibility:auto`).

### Persistence and sync
- `connect()` obtains `db` and subscribes to `tasks`, `meta/schema`, `meta/views`. Snapshots that only echo local writes are ignored by comparing `stable()` JSON; tasks with pending writes (`timers`, `busy`) or drafts are kept.
- Writes: `persist(id, delay)` debounces then `queueWrite(key, fn)` chains per key, at most 4 in flight overall, retrying `unavailable`/`resource_exhausted` with backoff; `saveSchema()`/`saveViews()` debounce 350 ms; deletes via `persistDelete`. `cacheLocal()` writes the `localStorage` copy 400 ms after changes.
- Sync indicator (`#sync`, hidden text on phone): `saving`, `ok`, `local`, `error`.

### Rules, views, menus
- Rules engine: an unfinished rule (blank value) does nothing; `closeMenu()` drops unfinished filters. Filters and color rules share `test`; `rowColor` takes the first ready matching rule.
- Board: drag cards between columns (`data-drop="grp:<id>"`), hold a column header to reorder (the "No …" column too, `data-o=""`). List: rows are `.sw-row` (swipeable). Table: hold a header to move the column, hold a row to reorder (`.tbody`, `grp:*`). Dropping into a sorted view turns its sort off with Undo.
- Calendar: scopes month, week, 3day, day; multi-day dates are placed on every covered day; month cells show 3 entries + "+N more" (desktop) or 4 dots (phone). Time grid has drag to move (15 min snap) and a bottom handle to resize; the all-day area collapses (`adtoggle`) and resizes by its bottom edge (`[data-adrs]`). On a phone week (`.tg.lines`) entries are colored lines and tapping an all-day cell opens that day.
- Settings lists reorder with `sortable()`; "All properties" order is applied to every view's `cols`; the page sheet lists properties in the current view's order.
- Colors: a custom color updates live without redrawing the menu (replacing the `<input type=color>` closes iOS's picker).
- `#menu` is a popover on desktop and a bottom sheet on phones; `MN.tall` makes it near full height while typing; `--kb` from `visualViewport` keeps content above the keyboard.
- Drag and drop: mouse starts after 5 px, touch after a 360 ms hold; drop kinds `grp`, `date`, `slot`, `allday`.

## Publishing
Inside a Claude Code session with the Artifact tool: run `node build.js`, then publish **`dist/tagwerk.html`** to the existing artifact URL (`url` parameter) so the link stays the same; `capabilities` are carried forward (`db`). Always republish the whole built file (the `edits` shortcut would change only `dist/`, which the next build overwrites). Read the live artifact first if it may have changed. Verify data with `ArtifactData` (`list` collection `tasks`, `get` `meta/schema`, `meta/views`). The user edits data and views while you work: re-read before any migration and pin writes with `if_version`.

## Conventions
- Vanilla JS, no dependencies, no transforms beyond includes. Put code in the file that owns the topic; keep files focused (split one that passes about 250 lines).
- Match surrounding style: compact one-line handlers, `const`/arrow helpers, short comments only for non-obvious reasons.
- Escape user text with `h()` in every HTML string. Wrap `localStorage` in try/catch.
- New settings must be stored in `schema.settings` or the view object, exposed in the settings pages, and survive a reload.
- CSS: put a rule in the file of the component it styles, phone overrides in that file's `@media (max-width:640px)` block. Watch cascade order across files: a later file's rule of equal specificity wins over an earlier phone override.
- Each UI change: check phone (402x874) and desktop, light and dark, then run `node tests/smoke.js` and look at the screenshots. Add a `check(...)` to the smoke test for new behavior.
- Do not put model identifiers in commits, code comments or files.

## Known limits and ideas
- Whole-view `innerHTML` rebuild; fine to about 1,000 tasks, hitches at a few thousand. Ideas: in-place row updates, virtualization, archive finished tasks, skip background re-render while typing in the sheet.
- Whole `tasks` collection is subscribed and mirrored in `localStorage` (about 5 MB limit); platform guidance is hundreds to low thousands of documents, hard cap 25,000.
- Not implemented: formulas, relations, rollups, "any of" filter groups, forms, recurring tasks, reminders/notifications.
- Sample data: Settings → General → "Add sample pages" / "Remove N sample pages" (only `demo:true` pages).
- `:hover` rules live inside `@media (hover:hover)` (iOS keeps hover after a tap); touch feedback uses `:active`. Scrolling flex containers get end space from an `::after` child, because Safari drops their bottom padding.
- Not verified on a real device: finger feel of gestures, iOS keyboard inside the Claude app, Safari-only rendering. Tests run in Chromium.
- On phones the table text and the sheet's Done button use the desktop font sizes (14 px and 15 px): the larger phone sizes were overridden in the original file and were removed in the split to keep the look unchanged.
