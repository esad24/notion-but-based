# Layout, scrolling and performance

## One axis at a time (no diagonal scrolling)
A single element with `overflow:auto` scrolls both ways. Nest scrollers instead:
- Outer `overflow-y:auto` (the page area) with an inner `overflow-x:auto; overflow-y:hidden` (for boards and wide content). iOS then locks each swipe to one axis.
- Add `overscroll-behavior-x: contain` on the inner one so a sideways swipe does not trigger browser back/forward.

## Tables where header and rows move together
Do not use two horizontal scrollers synced by JS (laggy, drifts). Use one horizontal scroller that contains both:
```
.hx   { overflow-x:auto; overflow-y:hidden }      /* the only horizontal scroller */
  .tbl { display:flex; flex-direction:column; height:100%; width:max-content; min-width:100% }
    .header      { flex:none }
    .rows-scroll { flex:1; min-height:0; overflow-y:auto; overflow-x:hidden }   /* vertical only */
```
The header stays visible because it is outside the vertical scroller, not because of `position:sticky`. No pinned first column (the user does not want it).

## Column widths
Generate widths into a `<style>` element (`.k0{width:300px}`...) and set an explicit total width on header and rows. This matters when rows use `content-visibility:auto` (off-screen rows skip layout and would shrink the scrollable width otherwise). Use `contain-intrinsic-block-size`, not `contain-intrinsic-size`. Resize a column by editing that style text, not by re-rendering.

## Preserve position
Re-rendering with `innerHTML` resets scroll. Save `scrollLeft` and `scrollTop` of the scrollers before, restore after; reset to 0 only when the user switches views.

## Rendering strategy
- Batch renders with one `requestAnimationFrame`; never render from a data snapshot echo of your own write (compare key-sorted JSON).
- Full `innerHTML` rebuild is fine up to about 1,000 items. Beyond that: update one row in place, virtualize long lists, skip background re-render while typing in an open detail sheet, archive old items.
- Delay and group writes: debounce text edits (300-600 ms), one write at a time per document.
- Cache to `localStorage` (try/catch, about 5 MB limit) so the app opens instantly; refresh from the database after.

## Calendars
- Month grid: 7 columns, cells `min-width:0`; on phone show dots per day and a list for the selected day below (agenda), swipe to change month.
- Time grid (week, 3 days, day): hour rows from a CSS variable, events absolutely positioned, overlap lanes computed by sweeping sorted events, now-line, drag to move (snap 15 min), drag the bottom edge to resize.
- Multi-day items appear on each day they cover; first day-of-week must be a setting.

## Dark mode and tokens
Define every token on bare `:root`; redefine inside `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){...}}` and `:root[data-theme="dark"]{...}`. The body needs an explicit background token. Tag colors: a background and foreground token pair per hue; a custom color is mixed from the user's hex with the surface and text colors so it works in both themes.

## Misc
- `[hidden]{display:none!important}` always (flex/grid rules otherwise win over the attribute).
- Fixed overlays need `z-index` order: scrim < sheet < menu scrim < menu < toast.
- Escape user text with an `h()` helper whenever building HTML strings.
