---
name: web-app-craft
description: Build fast, iPhone-first web apps and Claude Artifacts (todo, tracker, database, calendar, planner, dashboard, tool, game) with Apple-style UX, gestures, bottom sheets, safe areas, smooth one-axis scrolling, live data, realistic test data and a tested headless-phone workflow. Use for any web app or interactive page the user wants "fast", "mobile friendly", "optimized for iPhone", "Notion-like" or "Apple-like", and when starting, continuing, fixing or polishing such a project.
---

# Web App Craft (iPhone-first, Apple UX, Claude Artifacts)

This skill collects the user's taste, the rules that worked and the mistakes already made while building web apps with Claude. Read it fully before you start, and walk the checklist at the end before you hand anything over.

---

## 1. The user's non-negotiables

1. **Phone first, iPhone 17** (402×874 CSS px, DPR 3). Desktop must work too, but the phone decides every layout.
2. **Fast and smooth, no lag.** Taps feel instant, scrolling is smooth in both directions, nothing jumps, and a re-render never loses the scroll position.
3. **One scroll axis at a time.** A scroll goes left-right or up-down, never diagonal. No pinned or sticky columns. When a header sits above scrolling rows, header and rows move together horizontally.
4. **Nothing at the display borders.** Controls and last items never sit under the home indicator, the notch, rounded corners or the keyboard.
5. **Apple UX for interaction and settings.** Use large titles, pill and segmented controls, inset grouped lists, switches, bottom sheets with a grabber and a Done button, back-swipe and native pickers. Content views may follow any look the user likes (Notion, Things, Linear…); settings and menus follow iOS.
6. **Gestures over taps** wherever iOS has a convention:
   - pull a sheet down to close (the first pull only hides the keyboard)
   - swipe right to go back
   - swipe rows (right = complete, left = delete with Undo)
   - swipe a calendar to change the period
   - press-and-hold, then slide, to reorder
   - swipe in from the left edge to open a drawer
7. **Everything customizable** when the app is a tool: fields, types, options, colors (many presets plus a custom picker), rules, views, ordering, folders and settings. The settings pages must expose all of it.
8. **No pointless toggles or steps.** Empty means "off" (an empty time field means all-day). Prefer fields that are always visible over a switch that reveals them.
9. **Basic web-app requirements are implied.** The user should not have to list them: reordering everything that has an order, Undo on destructive actions, dark mode, keyboard-safe fields, loading and empty states, sane defaults. Think like a senior iOS web developer and apply Apple's Human Interface Guidelines without being asked.
10. **Honest reporting.** Say what was tested and what was not (real iPhone, Safari, the iOS keyboard). Never claim device behavior you only simulated.

---

## 2. Workflow

1. **Read first.** In an existing project, read the project's CLAUDE.md and the whole source before you change anything. The user's list of bugs is a sample, not the full scope: find the underlying rule and fix the class of problem everywhere.
2. **Artifacts.** Load the `artifact-design` and `artifact-capabilities` skills first. For shared or persistent data, declare `capabilities:{db:{}}` and keep data out of the page source.
3. **Source layout.**
   - A small app can live in one file.
   - Once it passes about 1,500 lines, split it into small files under `src/`, with a tiny `build.js` that stitches include lines into one `dist/app.html`, the file you publish.
   - Order matters: CSS files go in cascade order, JS files share one scope top to bottom, and `const`/`let` used by top-level code must come from an earlier file.
   - The build should fail on a JS syntax error (with the line) and on any orphan file.
   - Keep each file focused, about 250 lines at most, with a one-line header comment saying what it holds.
4. **Patching.** Use small edits that assert the target text occurs exactly once (a Python `replace` guarded by `count == 1`, or exact-match edit tools). Rebuild or `node --check` after every patch.
5. **Realistic data early.** Generate realistic data (section 9) and look at the app with it. Most layout and performance problems only show up with hundreds of items.
6. **Profile when something feels slow.** Measure the JS time of a render in headless Chromium, then use a CDP CPU profile. Fix the hot spot, not a guess.
7. **Test.** Use a headless phone plus desktop smoke test (section 10). Take screenshots in light and dark, look at three to six of them, fix what you see, and re-run.
8. **Project memory.** Keep a CLAUDE.md in the repo covering the file map, data model, runtime behavior, commands and known limits. Update it with every structural change.
9. **Ship.**
   - Commit with clear messages (never with model names), then push.
   - Before republishing an artifact, read the live version. If it differs from your source, merge the changes.
   - Publish the built file to the same URL so the link stays the same; capabilities carry forward.
   - Verify the stored data with one read.
10. **Report** in short plain sentences, grouped by what changed for the user. End with what was tested and what was not.

---

## 3. iOS UX patterns and numbers

### Sizes (phone)
- Tap targets are at least 44×44 pt. List rows are 44–48 px, icon buttons 40 px, pills 34–36 px high.
- Body text is 15–17 px. **Every text input is at least 16 px**; anything smaller makes Safari zoom the page on focus.
- Large title: 30 px bold, letter-spacing about −0.02em.
- Corner radii: 14 px for sheet top corners, 12 px for grouped lists; pills are fully rounded.
- Separators are 0.5 px, inset past the icon: 54 px with an icon badge, 16 px without.

### Safe areas and edges
- Use `<meta viewport … viewport-fit=cover>` and `env(safe-area-inset-*)` on every fixed or edge-hugging element.
- Bottom padding is `max(env(safe-area-inset-bottom), 20px)`. Inside iframes such as Artifacts, `env()` often reports 0, so the minimum matters.
- Put the primary action in a **bottom bar** ("+ New item" on the left, a count on the right) rather than a floating corner button. Scrolled content gets enough bottom padding to clear the bar.
- Side gutters are `max(16px, env(safe-area-inset-left))`, and the same on the right.
- Toasts sit above the bottom bar, never on it.

### Sheets (menus, pickers, detail pages)
- **Layout:** grabber (36×5 px), centered title, **Back** on the left when nested, **Done** on the right (accent color, semibold). Content sits on a grouped background (`#f2f2f7` light, `#1c1c1e` dark) with white or `#2c2c2e` cells.
- **Animation:** open with translateY plus a scrim fade (about 320 ms, `cubic-bezier(.2,.9,.25,1)`), and **close with the same animation**. Never just hide the sheet.
- **Gestures:** pull down to close; swipe right to go back a level.
- **Keyboard:** a sheet grows to nearly full height (`top:12px`) while a text field is focused. Track the keyboard with `visualViewport` (`--kb = innerHeight − vv.height − vv.offsetTop`) and add it to the bottom padding.
- **Focus:** call `.focus()` synchronously in the tap handler; inside `setTimeout` or rAF, iOS will not open the keyboard.
- **Desktop:** the same pages render as anchored popovers.

### Grouped lists (settings)
- A small gray uppercase header above each group and a gray explanation footer below it.
- **Cell:** icon badge (rounded square, saturated color, white glyph) + label + value + chevron.
- **Controls:**
  - Switch: 51×31, green when on.
  - Segmented control: for 2–4 choices.
  - Native `<select>`: for longer lists (iOS shows its wheel).
  - Native date, time and color inputs.
- **Destructive actions:** red cells at the bottom, confirmed by a second tap ("Tap again to delete"). There are no `confirm()` dialogs, and `alert/confirm/prompt` don't work in Artifacts anyway.
- **Reorder:** press and hold **anywhere on the row** (the grip works too) and slide. A tiny grip-only handle is not enough; people try the whole row first.

### Navigation and chrome
- Views are pill tabs (the selected one filled and inverted), scrollable sideways, with a `+` pill at the end.
- Search is a bar under the title with a **Cancel** link; Escape or Cancel clears it.
- An active filter or sort gets an accent dot on its icon plus removable chips under the tabs.
- Destructive or moving actions get an Undo toast (5 s) instead of a confirmation.
- **Multiple documents or databases:** use a sidebar with a folder tree (Notion-like). On desktop it is a collapsible column. On a phone it is a left drawer opened by a button left of the title, by tapping the title, or by swiping in from the left edge (under 18 px); swiping it left or tapping the scrim closes it. Rows fold folders, hold-and-slide reorders, and "…" opens an iOS sheet (rename, emoji icon, move to, delete). Deleting a folder moves its contents up one level; the last remaining item can't be deleted.

### Look
- **Font:** system first (`-apple-system, BlinkMacSystemFont, "SF Pro Text", …`).
- **Themes:** light and dark, following `prefers-color-scheme`, with an Automatic / Light / Dark setting.
- **Tags:** a soft tinted background with darker same-hue text. Offer 15 presets plus a custom color mixed with `color-mix` so it works in both themes.
- **Motion:** respect `prefers-reduced-motion`.
- **Hover:** every `:hover` rule goes inside `@media (hover:hover)`, because iOS keeps hover after a tap and leaves rows highlighted. Touch feedback uses `:active`.

---

## 4. Gestures (vanilla JS)

### Principles
- **Decide the axis after about 8–10 px.** A horizontal gesture claims the touch only when it is clearly horizontal (about 1.5–2× the vertical movement). A vertical close claims it only when the scroller is at the top. Otherwise the browser scrolls.
- **Start only from safe places.** Ignore touches that begin on grips, segmented controls, color grids or inputs, or while a drag or sort is active.
- **`touchmove` and `touch-action`:**
  - Listeners that call `preventDefault` must be `{passive:false}`, and call it only after the gesture has claimed the touch.
  - Use `touch-action:pan-y` on swipeable rows and `touch-action:none` on grips and resize handles.
- **Desktop path.** Always provide mouse and keyboard equivalents: mouse drag starts after 5 px, Escape closes or goes back, arrow keys navigate calendars.

### Patterns

| Gesture | Behavior |
|---|---|
| Pull sheet down | Follows the finger, closes past about 100 px, otherwise springs back. With an input focused, the first pull only blurs it. |
| Swipe right in a nested sheet | The page slides right and goes back past about 80 px. |
| Swipe a list row | The row slides over a colored background (green = complete to the right, red = delete to the left); the label scales up past 88 px; it commits after a short slide-out; then an Undo toast appears. |
| Swipe a calendar | Left or right changes the period (needs more than 60 px and 1.6× more horizontal than vertical); the grid slides in from that side. |
| Swipe elsewhere with the keyboard up | Blur the field (outside sheets). |
| Hold, then slide (drag & drop) | Starts after a 360 ms hold, cancelled if the finger moves more than 10 px first. A ghost follows the finger, the drop target highlights, an insertion line shows the landing spot, and the edges auto-scroll. |
| Reorder a list | Hold anywhere on the row (or grab the grip) and slide. The other rows animate out of the way (translateY by the dragged row's height, 220 ms), the list auto-scrolls at its edges, and the DOM and order are committed on release. |
| Reorder columns or headers | Same as reordering a list, horizontally, with a vertical insertion line. |
| Resize by an edge | Use a visible grabber with `touch-action:none` and pointer capture. Clamp between a minimum and the content height (or 60% of the screen). Save on release. |

### Conflicts to remember
- When a swipe claims the touch, cancel the pending press-and-hold timer.
- A row swipe claims the touch only after the axis is horizontal.
- After a drag, sort, resize or swipe, swallow the next click for one tick (`swallowClick`), otherwise the item opens on release.
- Sheet gestures must step aside while a sort is lifted.
- `navigator.vibrate` doesn't exist on iOS: wrap it in try/catch and never depend on it.
- On draggable items, set `-webkit-touch-callout:none; user-select:none`.
- **Dropping into a sorted view:** a hand-made order can't show while a sort is active. Turn the sort off and say so in a toast with Undo.

---

## 5. Layout, scrolling and performance

### One axis at a time
- A single `overflow:auto` element scrolls both ways, so nest scrollers instead.
- The outer one is `overflow-y:auto`. The inner one is `overflow-x:auto; overflow-y:hidden; overscroll-behavior-x:contain`.

### Tables where the header and rows move together
Use one horizontal scroller that contains both; never two scrollers synced by JS.
```
.hx   { overflow-x:auto; overflow-y:hidden }            /* the only horizontal scroller */
  .tbl { display:flex; flex-direction:column; height:100%; width:max-content; min-width:100% }
    .header      { flex:none }
    .rows-scroll { flex:1; min-height:0; overflow-y:auto; overflow-x:hidden }
```
- The header stays visible because it sits outside the vertical scroller.
- Generate column widths into a `<style>` element and set an explicit total width on header and rows. This matters with `content-visibility:auto`, where off-screen rows would otherwise shrink the scroll width.
- Use `contain-intrinsic-block-size`.
- To resize a column, edit that style text; don't re-render.

### Rendering and speed
- **Render loop:** batch renders in one `requestAnimationFrame`. Save `scrollLeft`/`scrollTop` before an `innerHTML` rebuild and restore them after; reset them only when switching views.
- **Cache `Intl` formatters.** `toLocaleDateString` and `toLocaleString` create a formatter on every call, which took about 400 ms for 700 table rows. Create each `Intl.DateTimeFormat` once and memoize relative date labels per day.
- **Page long lists.** Render the first 60–150 items per group, then a "Show more (60 of 164)" button that an IntersectionObserver clicks when it scrolls within about 600 px. This keeps renders at about 10–25 ms with 700+ items.
- **`content-visibility:auto`** with an intrinsic size on cards and rows.
- **Typing in a detail sheet:** update the data and the sheet immediately, but re-render the view behind it only after a 350 ms pause.
- **Writes:** debounce text writes (300–600 ms). Never read layout (`scrollIntoView`, `scrollTo`) right before a rebuild; it forces layout of the old DOM.
- **Scale:** a full `innerHTML` rebuild is fine up to about 1,000 items. Beyond that, use in-place row updates, virtualization or archiving.

### Calendars
- **Month view:**
  - Desktop: show 3 entries per cell plus "+N more", which opens the day.
  - Phone: show colored dots (cap about 4) and a list for the selected day below.
  - Swipe changes the month.
- **Time grid (week, 3 days, day):**
  - Hour rows come from a CSS variable; events are absolutely positioned.
  - Overlap lanes come from sweeping the events sorted by start; there is a now-line.
  - Drag to move (15 min snap), drag the bottom edge to resize, tap an empty slot to create.
  - A day header opens day view; the view scrolls to about 7:00 on open.
- **Phone week view:** seven columns are too narrow for text. Show entries as colored lines or blocks (a 3 px left bar plus a 28% tint), all-day items as 5 px bars, and let a tap on a day open day view. The 3-day view keeps its titles.
- **All-day area:** it can collapse to per-day counts and resizes by dragging its bottom edge; the height and open state are stored in the view.
- **Multi-day items** appear on every day they cover.
- **Week start** is a setting.
- **Phone header:** keep the title on one line (19 px, ellipsis), use icon-only extras, and put the segmented scope control full-width on its own row.

### Dark mode and tokens
- Define every token on bare `:root`.
- Redefine them twice: inside `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){…}}` and in `:root[data-theme="dark"]{…}`. A text patch has to hit both copies, or keep them in one included file.
- The body gets an explicit background.
- Tag colors come as a background/foreground token pair per hue.

### Safari specifics
- **`[hidden]{display:none!important}`:** without it, flex or grid rules beat the attribute and closed sheets keep swallowing taps.
- **Bottom padding in scrolling flex containers:** Safari drops it, so the last row hides under the edge. Add an `::after` child with the needed height instead of padding.
- **Inputs:** keep them at 16 px or more.
- **Native `<input type=color>`:** iOS opens its own picker (grid, spectrum, sliders). **Never replace the input while it is open**: update the preview in place on `input`/`change`. Re-rendering the menu closes the picker after the first pick.
- **Overlay z-index order:** scrim < detail sheet < drawer < menu scrim < menu < toast.
- **Escaping:** escape user text with an `h()` helper in every HTML string.

---

## 6. Data and persistence (Artifact `db` capability)

### Setup
- `const db = await claude.use('db')` can be `null`; the app must still work from `localStorage` and show "Saved on this device".
- Artifacts are private to the owner by default; say so if others need access.
- Never hard-code seed data in the page. Publish first, then write rows with `ArtifactData` (batch, up to 50 writes, entries can use a relative `file_path` to a JSON file). Design an empty state and a "Loading…" state.

### Shape
- **Items:** one document per item, `items/<id>` = `{title, body, created, updated, order, p:{<propId>: value}}`.
  - Store option **ids**, not names, so renaming or recoloring needs no migration.
  - Remove empty values (delete the key).
  - Store dates as plain strings (`YYYY-MM-DD`, `HH:MM`) to avoid timezone shifts. A date is `{d, t, ed, e}` (start and end, each with an optional time; empty time = all day).
- **Meta documents:** schema-driven apps keep `meta/schema` (properties, options, rules) and `meta/views` (view definitions).
- **App-wide settings and navigation:** keep them in their own doc (`meta/app`: folder tree plus theme, time format, week start), not inside one database's schema.
- **Several databases:** keep the first one at its original paths (no migration) and put the others under `dbs/<id>/…`. Path helpers take the database id.
- **Limits:** documents stay under 256 KiB; aim for hundreds to low thousands of documents, with a hard cap of 25,000 per artifact.
- **Per-device conveniences** live in `localStorage` (wrapped in try/catch, about 5 MB): last view, folder open state, sidebar hidden. Anything shared or durable goes in the database.

### Writes
- **Ordering:** one write at a time per document (a promise chain per key). Allow **at most about 4 writes in flight overall**, so bulk changes such as sample data or type conversions stay under the rate budget.
- **Retries:** retry `unavailable` and `resource_exhausted` with exponential backoff (about 4 tries). On `quota_exceeded`, tell the user plainly.
- **Never write from render code or a snapshot callback.** Debounce meta saves (about 350 ms).
- **Snapshot echoes:**
  - Ignore snapshots that only echo your own write (compare key-sorted JSON).
  - Ignore meta snapshots while a local meta save is pending.
  - Keep the local copy of an item that still has a pending write.
- **Switching data sets (databases or documents):**
  - Flush every pending debounced write and the local cache first, while the in-memory state still belongs to the old set.
  - Then unsubscribe (`onSnapshot` returns an unsubscribe function), load the next set from its cache and subscribe.
  - Guard callbacks with a generation number so a late snapshot from the old set is ignored.
  - Prefix write-queue keys with the set id.
- **Deleting a data set:** list its documents with `collection(...).get()` and delete them through the throttled queue.

### Changing the data shape (migration)
1. Make the loader accept both shapes (convert at read time).
2. **Publish the new code first.**
3. Re-read with `ArtifactData` (the user edits while you work), convert, and write in a batch with `if_version` on every existing document.
4. Read one converted document back.

### Typed properties (database-style apps)
- **Types:** title, text, number, select, multi-select, status (options grouped to-do / in progress / complete), date (start and end), checkbox, url, email, phone, created time, last edited time.
- **Type changes convert values:** options to text by name, text to options by creating them, text to number by parsing.
- **Rules engine:** filters and conditional colors share one condition engine (`{prop, op, val}` with operators per type).
  - **An unfinished rule (blank value) filters and colors nothing**; drop unfinished filters when the editor closes.
  - The first matching color rule wins, and rules can be reordered.
- **Order is meaningful everywhere:**
  - The option order drives pickers, board columns and sorting.
  - The global property order applies to every view; each view can still reorder its own columns.
  - The detail sheet lists properties in the current view's order.
  - The "No value" group is movable like any other group.

---

## 7. Feature defaults that make a todo / calendar / database app feel complete

Build these without being asked:
- **Views:** Table, Board, List (Reminders style) and Calendar (month, week, 3 days, day). Each view has its own filters, sorts, visible properties, grouping, and a "Show completed" switch; new List views hide completed items by default.
- **Reordering everywhere:** cards, rows, table columns, board columns, groups, options, properties, views, folders.
- **Undo** for delete, move, complete and sort-off.
- **Search** across title, notes and text fields.
- **Empty states, loading states** and a sync indicator (saving, saved, on this device, error).
- **Settings:** theme (Automatic/Light/Dark), 24-hour time, first day of week, and the database name.
- **Sample data:** an "Add sample pages / Remove N sample pages" control in settings (section 9).
- **Workspace:** several databases in folders, with templates for a new one: Tasks, Empty, Same structure as current.

---

## 8. Communication with this user

- They write tersely, sometimes interrupt with an extra requirement or "are you still there?". Answer at once in one or two sentences, restate the plan, continue.
- Feedback comes as concrete annoyances ("week view looks bad", "can't see the bottom of settings", "color picker closes"). Treat each as a requirement, find the rule behind it, and fix it everywhere it applies.
- They care about feel (speed, smoothness, intuitive gestures) more than feature count, but also want broad customizability.
- They like Notion's content views and Apple's interaction patterns, and find Notion's settings UX not ideal.
- They want continuity: preferences live in this skill, project knowledge in the repo's CLAUDE.md.
- Give updates while working: a short line every few steps on what you are doing.
- **Final answers:**
  - Short, plain sentences with no jargon or hex values, grouped by what changed for the user.
  - Name any behavior they might not want (for example, "dragging in a sorted view turns the sort off").
  - Close with what was tested and what was not.
  - Offer, don't assume, a pull request.
- **Outward actions:** ask before ones that weren't requested (sharing, deleting real data). Creating files, publishing a private artifact, pushing to the user's repo and adding clearly marked, removable sample data when asked are fine.

---

## 9. Realistic test data

- **Generator code:** write the generator as app code (`sampleTasks()`) so the user can add or remove samples in settings, and so you can run the same code in Node (`vm` context with the needed source files) to seed the database.
- **Deterministic:** use a seeded PRNG.
- **Marked:** every sample carries a flag (`demo:true`) and stable ids (`sx0000…`), so removing them never touches real data and re-adding overwrites instead of duplicating.
- **Realistic, not absurd:** about 4–7 months of data around today, about 2–7 items per weekday and fewer on weekends. Mix recurring items (standups, training), meetings, appointments, all-day todos, multi-day trips every few weeks, and an undated backlog. Past items are mostly done. Match the user's language and categories. About 700 items pushes the limits without being silly.
- **Measure:** check render times with this data on the phone profile.

---

## 10. Testing (headless Chromium via Playwright)

- **Environment:** the preinstalled Playwright and Chromium (`/opt/node-tools/node_modules/playwright`, `PLAYWRIGHT_BROWSERS_PATH`). Never run `playwright install`.
- **Wrapper:** imitate the artifact host with a doctype plus `[hidden]{display:none!important}`, and seed `localStorage` with `addInitScript`.
- **Contexts:**
  - Phone: 402×874, `isMobile`, `hasTouch`, DPR 2–3.
  - Desktop: 1300×850.
  - Use `colorScheme` light and dark.
- **Simple swipes:** dispatch synthetic `TouchEvent`s.
- **Hold-and-slide:** these need real pointer events. Use CDP `Input.dispatchTouchEvent` (touchStart → wait about 450 ms → touchMove steps → touchEnd). Synthetic TouchEvents do not produce pointer events.
- **Database stand-in:** test real persistence with an in-memory mock of `claude.use('db')` (`doc`, `collection`, `set`, `delete`, `get`, `onSnapshot` returning an unsubscribe). Assert the exact paths written.
- **What to check:**
  - header and rows in one horizontal scroller
  - no horizontal page overflow
  - sheets open, pull-to-close and swipe-back work
  - row swipes complete and delete with Undo
  - hold-and-slide reorders headers, rows and settings lists
  - the custom color input survives picking (same DOM node)
  - the last settings row clears the bottom edge
  - resize handles work
  - data lands at the right paths
  - no page errors
- **Output:** print `ok`/`FAIL` per check, exit 1 on failure, save screenshots.
- **Performance:** time a view switch (click → sync end) and use a CDP CPU profile for hot spots.
- **Honesty:** Chromium is not Safari. Real finger feel, the iOS keyboard inside the Claude app and Safari-only rendering stay "not verified on a device".

---

## 11. Mistakes already made (checklist before every delivery)

**Layout and CSS**
1. The `[hidden]` attribute lost to `display:flex` → add `[hidden]{display:none!important}`.
2. Diagonal scrolling from one scroller → use nested one-axis scrollers.
3. Header and rows drifting apart with two synced scrollers → use one horizontal scroller.
4. `content-visibility:auto` with `max-content` rows shrank the scroll width → set explicit widths.
5. A re-render reset the scroll position → save and restore it.
6. Controls at or under the bottom edge → use a bottom bar, safe-area minimum padding and an `::after` spacer in scrolling flex containers (Safari).
7. Dark tokens existed only inside a media query → define them on bare `:root` first, then both dark copies.
8. Narrow cells clipped values → allow wrapping.
9. The header was too compact → give the title row, tabs and chips real vertical space.
10. Sticky hover after a tap on iOS → put hover in `@media (hover:hover)`.
11. Seven-column week text was unreadable on a phone → use colored lines; tapping opens the day.
12. A long calendar title wrapped over the buttons → one line with an ellipsis and icon-only extras.

**iOS specifics**

13. Inputs under 16 px zoom the page.
14. `.focus()` must be called synchronously in the tap handler.
15. Use native select, date, time and color inputs.
16. Touch drag starts after a hold and cancels on early movement; `preventDefault` only once the drag has started.
17. Swipes decide the axis first; cancel a pending drag when a swipe claims the touch.
18. Sheets must animate out, not just hide.
19. No `navigator.vibrate` on iOS.
20. Measure an auto-size field after unhiding its container.
21. Re-rendering under an open native color picker closes it.
22. A grip-only reorder handle felt broken → allow hold anywhere on the row.

**Data and publishing**

23. Edits with a non-unique match failed → assert the match count is 1.
24. Change the data shape in this order: new code first, then the migration pinned to `if_version`, after re-reading.
25. Never hard-code seed data; design empty and loading states.
26. One write per document at a time, a global in-flight cap, retries with backoff, never write from render or snapshots.
27. Ignore your own snapshot echoes.
28. Unfinished rules must do nothing.
29. Keep test data out of real data, or mark it so it can be removed.
30. Wrap `localStorage` in try/catch.
31. Artifacts are private; say so.
32. Skills made in a cloud session vanish unless pushed to a repo or uploaded.
33. Switching data sets without flushing pending writes loses them; late snapshots of the old set must be ignored.
34. App-wide settings stored inside one database broke with several databases → keep them in a separate app doc.
35. Read the live artifact before republishing.

**Performance**

36. `toLocaleDateString` per row cost about 400 ms on a 700-row table → cache `Intl` formatters.
37. Very long boards and lists → page them, with auto "Show more".
38. Re-rendering the whole view on every keystroke in a detail sheet → re-render quietly after a pause.

**Process**

39. Reply quickly when interrupted.
40. Read code before patching it.
41. Run the smoke test after every large patch and look at the screenshots.
42. Don't over-promise device behavior.
43. Track multi-step work with tasks and mark them done only when verified.
44. No model identifiers in commits or files.
45. Keep CLAUDE.md current; split files that pass about 250 lines.
