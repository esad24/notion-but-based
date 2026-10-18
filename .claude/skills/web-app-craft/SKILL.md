---
name: web-app-craft
description: Build fast, iPhone-first single-file web apps (todo, tracker, database, calendar, dashboard, tool) as Claude Artifacts or plain HTML, with Apple-style UX, gestures, bottom sheets, safe areas, smooth one-axis scrolling and a tested headless-phone workflow. Use for any web app or interactive page the user wants "super fast", "mobile friendly", "optimized for iPhone", "Notion-like", or "Apple-like", and when starting or continuing such a project.
---

# Web app craft (iPhone-first, Apple UX)

The user's taste and the lessons learned from earlier builds. Read this file, then the references you need. Reusable code is in `snippets/`, a test harness in `templates/`.

## The user's non-negotiables
1. **Phone first, iPhone 17** (402x874 CSS px, DPR 3). Desktop must work too, but the phone decides every layout.
2. **Fast and smooth, no lag.** Smooth scrolling in both directions, instant taps, no layout jumps, no re-render that loses scroll position.
3. **One scroll axis at a time**: left-right or up-down, never diagonal. **No pinned/sticky columns.** Where a header sits above scrolling rows, header and rows must move together horizontally.
4. **Nothing at the display borders.** Controls and last items must never sit under the home indicator, notch, rounded corners or keyboard. Use a bottom bar or safe-area padding, not a floating button in the corner.
5. **Apple UX/UI principles for interaction and settings**: large titles, pill/segmented controls, inset grouped lists, switches, bottom sheets with a grabber and a Done button, back-swipe, native pickers. Content views may follow any look the user likes (for example Notion's table, board, calendar); settings and menus follow iOS.
6. **Gestures over taps** wherever iOS has a convention: pull a sheet down to close (first pull hides the keyboard), swipe right to go back, swipe rows (right = complete, left = delete with Undo), swipe a calendar to change period, press-and-hold then slide to reorder.
7. **Everything customizable** by the user when the app is a tool: fields, types, options, colors (many presets plus a custom picker), rules (conditional colors), views, ordering. Settings must expose it all.
8. **No pointless toggles or steps.** Empty means "off" (an empty time field means no time). Prefer always-visible fields over a switch that reveals them.
9. **Honest reporting.** Say what was tested and what was not (real iPhone, Safari). Never claim device behavior you only simulated.

## Workflow
1. If the output is an Artifact: load `artifact-design` and `artifact-capabilities` first; state the app needs shared data, then declare `capabilities:{db:{}}` and keep data out of the page source (seed with `ArtifactData` after publishing).
2. Work in the scratchpad. Keep ONE source file. Change it with small scripts or edits that **assert the target text occurs exactly once**. Run `node --check` on the extracted script after every patch.
3. Test with `templates/phone-smoke.js` (headless Chromium, phone + desktop, real TouchEvents). Open 3-5 screenshots and fix what you see. One look, one round of fixes, then publish.
4. Publish; verify the stored data with one read; report in short plain sentences.
5. Before finishing, walk `references/pitfalls.md` as a checklist.

## References
- `references/ios-ux.md`: the iOS patterns to copy and the exact numbers (sizes, safe areas, keyboard, sheets).
- `references/gestures.md`: how to build swipe-to-close, back-swipe, row swipes, press-and-hold drag, reorder; axis locking; conflicts with scrolling.
- `references/layout-and-scrolling.md`: nested scrollers, header-with-rows tables, sticky bars, virtualization notes, performance.
- `references/data-and-artifacts.md`: Artifact `db` capability patterns, saving, migration, sync echoes, schema-driven apps.
- `references/pitfalls.md`: mistakes made before, each with the fix. Treat as a checklist.
- `references/communication.md`: how the user writes and how to answer.

## Reusable code (`snippets/`)
`tokens.css` (light/dark tokens, system font), `ios-sheets-and-lists.css` (sheets, grouped lists, switches, segmented controls, swipe rows, toasts), `ios-gestures.js`, `menu-stack.js` (popover on desktop, bottom sheet on phone, page stack), `sortable.js`, `ios-settings-blocks.js`. They are extracted from a working app and need the globals named in each file's header comment; adapt names rather than rewriting from scratch.
