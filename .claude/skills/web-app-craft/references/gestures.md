# Gestures on touch (vanilla JS)

Working implementations live in `snippets/ios-gestures.js` and `snippets/sortable.js`.

## Principles
- **Decide the axis early.** After about 8 px of movement, compare |dx| and |dy|. Horizontal gestures win only when clearly horizontal (about 2x), vertical close gestures only when clearly vertical and the scroller is at the top. Otherwise let the browser scroll.
- Start a gesture only from a safe place: ignore touches that begin on grips, segmented controls, color grids, inputs, or while a drag is active.
- `touchmove` listeners that call `preventDefault` must be `{passive:false}`, and should call it only after the gesture has claimed the touch. Use CSS `touch-action: pan-y` on swipeable rows and `touch-action: none` on drag grips.
- Always provide a mouse/keyboard path too (desktop users): drag with the mouse, Escape closes, arrow keys navigate calendars.

## Patterns
| Gesture | Behavior |
|---|---|
| Pull sheet down | Follows the finger (`translateY`), closes past about 100 px, otherwise springs back. If an input is focused, the first pull only blurs it. |
| Swipe right in a nested sheet | Slides the page right, goes back past about 80 px. |
| Swipe a list row | Row slides over a colored background (green = complete on right swipe, red = delete on left swipe); the label scales up when past the 88 px threshold; commit after a short slide-out; show an Undo toast. |
| Swipe a calendar | Left/right changes month/week/day; animate the grid sliding in from the swipe side. Require > 60 px and 1.6x more horizontal than vertical. |
| Swipe elsewhere while the keyboard is up | Blur the field (outside sheets). |
| Hold then slide | Start after a 360 ms hold; cancel the hold if the finger moves more than 10 px first (it was a scroll). Ghost clone follows the finger, target highlights, insertion line shows where it will land, edges auto-scroll. |
| Reorder lists | Hold the grip, slide; swap siblings live; commit order on release. |

## Conflicts to remember
- Press-and-hold drag vs. row swipe: when a swipe claims the touch, cancel the pending drag timer.
- Row swipe vs. vertical scroll: only claim after the axis is horizontal.
- Clicks after a drag or swipe must be suppressed for one tick (`suppressClick`), or the item opens when you release.
- `navigator.vibrate` does not exist on iOS; do not rely on haptics.
- `contextmenu`/long-press callout: set `-webkit-touch-callout:none; user-select:none` on draggable items.
