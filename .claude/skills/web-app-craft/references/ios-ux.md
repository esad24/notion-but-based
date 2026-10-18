# iOS UX patterns and numbers

## Sizes (phone layout)
- Tap targets at least 44x44 pt. Rows in lists 46-48 px. Icon buttons 40 px. Pills 34-36 px high.
- Body text 15-17 px; **every text input at least 16 px** (smaller makes Safari zoom the page on focus).
- Large title 30 px bold at the top of the screen, letter-spacing about -0.02em.
- Corner radius: sheets 14 px top corners, grouped lists 12 px, pills fully rounded.
- Separators 0.5 px (`.5px` borders), inset from the left past the icon (54 px with icon badge, 16 px without).

## Safe areas and edges
- `<meta viewport ... viewport-fit=cover>`. Use `env(safe-area-inset-*)` on every fixed or edge-hugging element.
- Bottom padding = `max(env(safe-area-inset-bottom), 20px)` so there is always air under the last control, even on browsers that report 0.
- Put the primary action in a **bottom bar** ("+ New item", count on the right) instead of a corner floating button; scrolled content gets bottom padding so the last row can scroll clear of the bar and the home indicator.
- Side gutters: `padding-left: max(16px, env(safe-area-inset-left))` and the same for the right.
- Toasts sit above the bottom bar, not on it.

## Sheets (menus, pickers, detail pages)
- Bottom sheet: grabber (36x5 px, centered), title centered, **Back** on the left when nested, **Done** (accent, semibold) on the right, content on a grouped background (`#f2f2f7` light, `#1c1c1e` dark) with white/`#2c2c2e` cells.
- Open with translateY + scrim fade (about 320 ms, `cubic-bezier(.2,.9,.25,1)`); **close with the same animation** (do not just hide).
- Pull down to close; first pull while the keyboard is up only hides the keyboard. Swipe right goes back a level.
- Typing sheets grow to nearly full height (`top: 12px`) when a text field is focused, so the keyboard never covers the field. Track the keyboard with `visualViewport` (`--kb = innerHeight - vv.height - vv.offsetTop`) and add it to bottom padding.
- Focus a field from the tap handler **synchronously** or iOS will not open the keyboard.

## Grouped lists (settings)
- Group header: small gray uppercase text above the group; footer: gray explanation below.
- Cell: icon badge (rounded square, saturated color, white glyph) + label + value + chevron.
- Switch: 51x31 px, green on. Segmented control for 2-4 mutually exclusive choices. Use native `<select>` for longer lists (iOS shows its wheel), native `<input type=date|time|color>`.
- Destructive actions are red cells at the bottom, confirmed by a second tap ("Tap again to delete").
- Reorder with a grip on the left; hold the grip and slide.

## Navigation and chrome
- Views as pill tabs (selected = filled dark/inverted), horizontally scrollable, `+` pill at the end.
- Search: a bar that appears under the title with a **Cancel** link; Escape or Cancel clears it.
- Filter/sort active state: accent dot on the icon and removable chips under the tabs.
- Undo toast (5 s) after destructive or moving actions instead of confirmation dialogs. `alert/confirm/prompt` do not work inside Artifacts anyway.

## Look
- System font first: `-apple-system, BlinkMacSystemFont, "SF Pro Text", ...`. Both light and dark; follow `prefers-color-scheme` and offer Automatic/Light/Dark in settings.
- Soft tinted backgrounds with a darker same-hue text for tags (many presets plus a custom color mixed with `color-mix`).
- Respect `prefers-reduced-motion`.
