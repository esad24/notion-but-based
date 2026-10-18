# Mistakes already made (checklist)

## Layout and CSS
1. **`[hidden]` ignored**: `display:flex/grid` beats the attribute, so closed sheets stayed on screen and swallowed taps. Add `[hidden]{display:none!important}`. A bare test wrapper lacks the publish reset, so the bug may only show in tests.
2. **Diagonal scrolling**: one `overflow:auto` element scrolls both ways. Use nested scrollers (see layout-and-scrolling.md).
3. **Header/rows out of sync**: two horizontal scrollers synced by JS lag and drift. Use one horizontal scroller that contains both.
4. **`content-visibility:auto` + `width:max-content` rows** shrink the scrollable width. Set explicit widths; use `contain-intrinsic-block-size`.
5. **Re-render reset scroll position** after every edit. Save and restore `scrollLeft/scrollTop`; reset only when switching views.
6. **Controls too close to the bottom edge** or hidden behind it. Bottom bar + `max(env(safe-area-inset-bottom),20px)`; sheets with bottom padding; add keyboard height.
7. **Dark mode**: tokens defined only inside a media or `[data-theme]` block produce unreadable text when no attribute is set. Define on bare `:root` first. When patching, the dark token block appears twice (media query and attribute), so a replace needs count 2.
8. Text clipped in narrow cells: allow wrapping (`white-space:normal`) for values like date ranges.
9. Header too compact: give the title row, tabs and chips real vertical space (the user noticed).

## iOS specifics
10. Inputs under 16 px zoom the page on focus.
11. Open the keyboard by calling `.focus()` synchronously in the tap handler (not in `setTimeout`/rAF).
12. Use native `select`, `date`, `time`, `color` inputs on phones; hide their default chevron if you draw your own.
13. Touch drag must start after a hold (about 360 ms) and cancel if the finger moves first; `preventDefault` on `touchmove` only once a drag has started.
14. Swipes: decide the axis after about 8 px; ignore touches starting on grips, segmented controls, color grids; cancel a pending drag when a swipe claims the touch.
15. Sheets must animate **out** as well as in; closing by simply hiding looks broken.
16. `navigator.vibrate` does not exist on iOS: try/catch and do not depend on it.
17. A detail sheet's auto-sizing title box must be measured after the sheet is unhidden (a hidden element has no height).

## Data and publishing
18. **Edits need a unique `old_str`**: the Artifact `edits` parameter and python `replace` fail if the text occurs twice. Add context or assert `count == 1`.
19. **Changing the data shape**: publish new code first, then migrate with a batch pinned to `if_version`, after re-reading (the user edits while you work). Keep the loader tolerant of the old shape.
20. Never hard-code seed data in the page; seed with `ArtifactData` after publishing; design an empty state.
21. One write at a time per document; debounce text; never write from render or a snapshot callback.
22. Ignore snapshot echoes of your own writes, or typing and dragging feel laggy.
23. **Unfinished rules** (blank value) must not filter or color; drop unfinished filters on close. An empty filter chip once stayed in a saved view.
24. Keep test data out of the real database (a test once showed a 1970 timestamp).
25. `localStorage` can throw or be full: always try/catch.
26. Artifacts are private; tell the user if others need access.
27. Skills made in a cloud session live in a temporary container; they vanish unless pushed to a repo or uploaded to the account.

## Process
28. Reply quickly when the user interrupts or asks whether you are there; restate the plan in a few lines, then build.
29. The Edit tool needs a prior Read of the file; a Bash/python patch does not. Read the region before you patch it.
30. Run the headless smoke test after every large patch; it caught the `[hidden]` bug, the lost scroll position and the hidden-title measurement.
31. Do not over-promise: Chromium is not Safari. Say that real finger feel, the iOS keyboard and Safari rendering were not tested.
32. Track multi-step work with TaskCreate/TaskUpdate; mark done only when verified.
33. Commit messages and pushed files must not contain model identifiers.
