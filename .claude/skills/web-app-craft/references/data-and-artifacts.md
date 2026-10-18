# Data patterns for Artifact apps (`db` capability)

## Setup
- Declare `capabilities:{db:{}}`. `const db = await claude.use('db')` can be `null`: the app must still work from `localStorage` and show a "Saved on this device" state.
- Publishing is private to the owner by default; tell the user when others would need access.
- Never hard-code seed data in the page. Publish first, then write rows with `ArtifactData` (batch up to 50 writes). Show a designed empty state when the store is empty.

## Shape
- One document per item (`items/<id>`): `{title, body, created, updated, order, p:{<propId>: value}}`. Store option **ids**, not names, so renames and recoloring need no data migration.
- Schema-driven apps keep `meta/schema` (properties, option lists, rules, settings) and `meta/views` (view definitions) as two documents, loaded by `onSnapshot`.
- Values: omit empty ones (delete the key). Dates as plain strings (`YYYY-MM-DD`, `HH:MM`) so no timezone shifts.
- Keep documents small (limit 256 KiB) and the collection to hundreds or low thousands; total cap 25,000 documents per artifact.

## Writes
- One write at a time per document (promise chain per key); await before the next.
- Debounce typing. Never write from render code or from a snapshot callback.
- Retry once after `unavailable`. On `quota_exceeded` tell the user plainly.
- Ignore snapshots that only echo your own write (compare with a key-sorted JSON string), and ignore incoming meta snapshots while a local meta save is pending.
- Keep the in-memory copy of an item that has a pending write when a snapshot arrives.

## Changing the data shape (migration)
1. Make the loader accept both shapes (convert old to new at read time).
2. **Publish the new code first** so every open copy reloads into code that understands the new shape.
3. Read the current documents with `ArtifactData` (the user edits while you work), convert, and write with a batch using `if_version` for each existing document.
4. Verify by reading one converted document back.

## Typed properties (database-style apps)
Types worth having: title, text, number, select, multi-select, status (options grouped to-do / in progress / complete), date (start and end, each with optional time), checkbox, url, email, phone, created time, last edited time. Changing a property's type converts values (options to text by name, text to options by creating them, text to number by parsing, etc.).

Rules (filters and conditional colors) share one condition engine: `{prop, op, val}` with operators per type. **An unfinished rule (value still blank) must filter and color nothing**; drop unfinished filters when the editor closes. First matching color rule wins; allow reordering.

## Verification after publishing
Read back one collection with `ArtifactData list` (and the meta documents). Report in one line what you checked and what you could not.
