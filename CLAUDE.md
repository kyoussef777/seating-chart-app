# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a wedding/event seating chart management application built with Next.js 15, featuring a dual-interface design: a guest portal for attendees to find table assignments and an admin CMS for event organizers to manage seating arrangements with drag-and-drop functionality.

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build
npm start

# Code quality
npm run lint
npm test               # node:test, runs src/**/*.test.ts directly

# Database operations
npm run db:generate    # Generate migrations from schema changes
npm run db:migrate     # Apply migrations to database
npm run db:push        # Push schema changes directly (development)
npm run db:studio      # Open Drizzle Studio GUI

# Admin user management
npm run create-admin   # Create admin user interactively
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: Neon PostgreSQL (serverless)
- **Authentication**: JWT with HTTP-only cookies
- **UI**: Tailwind CSS 4, React DnD for drag-and-drop
- **File Processing**: PapaParse for CSV import

### Database Schema
The application uses Drizzle ORM with these tables:
- `users` - Admin authentication
- `eventSettings` - Event configuration (template, name, kicker, venue, date,
  homepage text, search-closed message, search toggle, address-collection toggle)
- `tables` - Seating arrangements: position, rotation, an optional width/height
  size override (null = the shape's default footprint) and an optional accent
  colour key
- `guests` - Guest information, party size, optional table assignment
- `labels`, `shapes`, `referenceObjects` - Floor-plan decoration layer, each
  with its own styling columns (label ink/backdrop/weight/alignment, shape
  fill/opacity/border, object caption and tint)

Key relationship: `guests.tableId` → `tables.id` (nullable, cascades to null on delete)

### Application Structure

**Dual Interface Design:**
- **Guest Portal** (`/`): Autocomplete search, table lookup, optional address
  collection, rendered by one of three event templates
- **Admin Dashboard** (`/admin`): Seating chart, Roster, guest management, CSV import

**Admin tabs:** Seating Chart (spatial floor plan), Roster (who is sitting with
whom — drag guests between tables and the unassigned list), Guest List, Event
Settings (template picker, event copy, guest-facing toggles, live preview),
User Management. Both seating views share `src/lib/seating.ts`, which owns
capacity maths, canvas bounds, the table shape/colour/size vocabulary and
assignment persistence. `TABLE_SHAPES` there is the single allow-list: the API
used to accept only round and rectangular, so picking any other shape in the
Add Table dialog silently created a round table.

**API Routes:**
- `/api/auth/*` - JWT authentication (login, logout, session validation)
- `/api/guests` - CRUD operations, table assignments (PII stripped for public callers)
- `/api/guests/import` - CSV import
- `/api/tables` - Table management with positioning
- `/api/settings` - Event configuration
- `/api/users` - Admin user management (create, update, delete)
- `/api/layout/{labels,shapes,reference-objects}` - Floor-plan decoration layer
- `/api/csrf` - CSRF token issuance

### Key Features

**Seating Chart (`/src/components/admin/SeatingChart.tsx`):**

Everything selectable on the canvas — tables, labels, shapes, reference objects
— is projected into one `CanvasItem` view (`floorplan/types.ts`), and every
gesture works against that rather than against four different record shapes.

- **Gestures.** One pointer path (mouse, pen, touch) covers move, resize,
  rotate, marquee select and pan; a single window-level loop interprets
  whichever is in flight, so releasing outside the canvas still ends cleanly.
  Dragging moves the whole selection.
- **Tools.** Select (V) drag-selects a band; Pan (H), a held Space, a middle
  drag, or any touch drag pans. Ctrl/⌘+wheel and pinch zoom at the cursor,
  20%–300%; F frames the plan.
- **Selection chrome** lives in one overlay layer above every item
  (`floorplan/SelectionOverlay.tsx`), never nested inside the item. Nesting it
  is what put the old font-size buttons *inside* a label's contenteditable, so
  blurring a selected label appended "A-A+" to its text. Grips hide when the
  item is smaller on screen than the grips themselves, or they blanket it and
  swallow its own clicks.
- **Inspector** (`floorplan/Inspector.tsx`) edits the selected item by number:
  table name/shape/seats/size/accent, label text/size/weight/alignment/backdrop/
  ink, shape fill/opacity/border, object caption/tint, and rotation for all.
- **Undo/redo** (Ctrl/⌘+Z, Ctrl/⌘+Shift+Z) covers layout: moves, resizes,
  rotations, alignment, arranging and styling. A gesture snapshots state when
  it starts but only commits it once something has actually moved, so selecting
  things does not bury the real change under a pile of no-op entries that make
  Ctrl+Z look broken. Adding or deleting a *table*, and
  seating a guest, are server-side operations and sit outside the stack. Restore
  diffs are computed from `tablesRef`, not inside a `setTables` updater — React
  defers that callback, so anything collected in it is empty by the time the
  writes go out.
- **Seeing who is seated** has two routes, because one is a glance and the
  other is the answer: the seat-count (or its badge) opens a list on the table
  itself, and selecting a table lists everyone on it in the inspector, with a
  button to take them off. Both the pop-up and the inline rename field are
  counter-scaled by the zoom — they live inside the scaled plan, so at a normal
  working zoom they would otherwise render a few unreadable pixels tall. The
  table's own box must never set `overflow: hidden`: the pop-up and the
  seat-count badge are positioned outside it, and clipping the root hid both
  completely.
- **Editing text** is double-click everywhere — a table's name and a label's
  text alike — because a single click has to stay "select and drag", and any
  slight movement during a single-click rename turned into a drag instead. The
  inspector carries the same text as a plain field, which is the reliable route
  when the plan is zoomed out.
- **Stacking** is explicit (`floorplan/layers.ts`): shapes, then reference
  objects, then tables, then labels. Labels caption what they sit on, so they
  must stay on top; relying on DOM order hid a label behind any table it
  overlapped. A table sets its own z-index, which makes it a stacking context —
  so anything inside it can only paint within the table's own slot, however
  large its z-index. That is why a table's guest list appeared *behind* the
  table next to it, and why a table lifts its whole self (`LAYER.tablePopup`)
  while that list is open. DraggableTable and the canvas share the one table of
  numbers for exactly this reason.
- **Nothing floating over the plan may trap part of it.** The inspector docks to
  whichever edge the selection is not on (selecting a table in the top-right
  corner used to hide it, and its guest list, the instant it was clicked); the
  mini-map only renders while part of the plan is off screen, since framed to
  fit it says nothing and still swallows clicks on whatever sits beneath it; and
  the guest list flips above its table and slides sideways to stay inside the
  visible plan.
- The edit zone (floor-plan size) is configurable in px and can be locked.
  Shrinking it pulls stranded items back inside rather than leaving them
  invisible and unselectable. Preferences (grid, snap, guides, mini-map, lock,
  tool, floor size) live in localStorage.
- **Layout objects autosave** ~800ms after any change, and `lastSavedLayoutRef`
  only advances once the writes come back OK — marking it up front meant a
  rejected save was recorded as written and never retried. The ids come back as
  UUIDs, so anything keyed off the `label-`/`shape-`/`ref-` prefixes breaks for
  saved items — match against the collections instead.
- **Mini-map** (`floorplan/MiniMap.tsx`) draws every item to scale, frames the
  visible region, and clicking or dragging it moves the view. It measures that
  region with a ResizeObserver whose effect depends on `loading`: the chart is
  not in the DOM during it, so an effect with empty deps bailed out on a null
  ref and never ran again, leaving the measured viewport at zero for the life
  of the page.
- **Touch.** Tap targets use Tailwind's `pointer-coarse:` variant rather than a
  width breakpoint: `sm:` releases the 44px floor at 640px, which is exactly
  where a tablet sits — an iPad is 768px wide and entirely finger-driven, so
  every control had shrunk to desktop metrics on the device that needed the big
  one. On a phone the editing controls live in a capped, scrolling drawer so
  they cannot push the plan off the first screen; align and distribute are
  hidden there because they need a multi-selection and the marquee that makes
  one is a pointer gesture. On-canvas chrome is sized in screen pixels, so it
  is counter-scaled against the zoom and nudged back inside the plan — zoomed
  out, the buttons are wider than the item they belong to and would otherwise
  hang off the edge.

**Floor-plan geometry (`/src/lib/floorplan.ts`):**
- Pure, DOM-free and unit tested: rotation-aware resize (the delta is
  interpreted in the box's own frame, so a rotated item grows along the edge you
  grabbed), angle snapping, marquee hit-testing, align/distribute across every
  item kind, four auto-arrange layouts, alignment guides, and bounds clamping.
- Coordinates are always floor-plan pixels; callers divide pointer deltas by the
  zoom before passing them in.

**Layout objects (`/src/lib/layout-objects.ts`):**
- Types, palettes, presets and normalisers for labels, shapes and reference
  objects, shared by the canvas and the three `/api/layout/*` routes so a
  malformed payload cannot become a malformed row. Deliberately React-free so
  route handlers can import it; the lucide icon per object type lives in
  `floorplan/icons.ts`.

**Theme System (`/src/lib/theme.ts` + `/src/hooks/useTheme.ts`):**
- Centralized theme configuration for easy color scheme changes
- Current theme: Gold/Amber with black text
- Pre-built component styles for consistency
- Alternative themes available (Rose, Blue, Emerald)

**Event Templates (`/src/lib/templates.ts`):**
- One registry entry per event type: `bridal-shower`, `wedding`, `engagement`.
  Each carries a palette, border radii, font stack and default copy.
- The admin picks the template in Event Settings; it is stored on
  `eventSettings.template` and resolved with `resolveTemplate()`, which falls
  back to the default for an unknown or missing id.
- Adding an event type = one registry entry + one scenery component under
  `src/components/guest/templates/`, wired into `GuestPortal`. Nothing else
  changes.

**Guest Portal structure:**
- `src/app/page.tsx` — server component. Reads the settings row directly (so the
  portal renders with the right copy, and `generateMetadata` can title the page
  after the event) and passes it to the client. A database failure yields `null`
  and the client falls back to fetching `/api/settings`.
- `src/hooks/useGuestPortal.ts` — all portal behaviour: settings, guest/table
  data, autocomplete, table lookup, address capture.
- `src/components/guest/PortalPanels.tsx` — header, search, result and address
  panels, styled from the template's palette. Shared by every template.
- `src/components/guest/templates/*` — scenery and frame only.

**Roster (`/src/components/admin/RosterView.tsx` + `/src/lib/roster.ts`):**
- Moving somebody never requires a drag. Every guest row carries a move button
  that opens `MoveGuestsDialog` — search, arrow keys, Enter. With two dozen
  tables the roster is three screens tall, so dragging a card to a target that
  is rarely on screen at the same time was the whole problem; worse, the
  tap-to-seat path was gated on `useIsTouch()`, so a desktop had no alternative
  at all.
- The picker lists tables that fit the group first, snuggest fit first, and
  still shows the ones that do not fit, greyed out with their free count, so
  "why isn't Table 6 here?" never comes up. "Remove from table" sits last in
  both the visual and keyboard order: it used to be row 0, so a quick
  type-and-Enter unseated the guest instead of moving them. When nothing fits,
  nothing is highlighted and Enter does nothing.
- Guests can be ticked individually or a whole table at once, then moved or
  unseated together. `planBulkMove()` packs smallest parties first and reports
  who did not fit rather than half-failing silently.
- `lib/roster.ts` is pure and unit tested: natural table ordering (so "Table 2"
  precedes "Table 10" — a plain locale compare is what made a long roster hard
  to scan), search that *narrows* cards rather than only tinting them,
  has-room/full/empty filters, and the seat maths that discounts the guests
  being moved from their own target.

**Guest list sorting (`/src/lib/guest-sort.ts`):**
- `queryGuests()` filters (search, seated/unassigned/missing phone or address,
  table) then sorts (first name, last name, table, party size). Pure and unit
  tested; the admin Guest List derives its rows from it with `useMemo`.

**Guest Search (`/src/lib/guest-search.ts`):**
- Real-time autocomplete with keyboard navigation, scored by match quality
- Shows guest names with table assignments and party sizes
- Capped at 10 suggestions; unit tested in `guest-search.test.ts`

**Event settings validation (`/src/lib/event-settings.ts`):**
- `normalizeSettingsUpdate()` validates and trims a settings payload; the API
  route and the admin form both use it, so they cannot disagree.
- `toPortalSettings()` turns a (possibly missing or older) row into the settings
  the portal renders. A blank optional field means "hide that line" — it is not
  refilled from the template.

### Authentication Flow

1. Admin login via `/admin/login` → JWT token in HTTP-only cookie
2. Session validation on admin routes via `/api/auth/me`
3. Token expires after 24 hours
4. Password hashing with bcrypt (12 salt rounds)

### Environment Setup

Required environment variables (see `.env.example`):
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secure token signing key

Both are read at request time, not import time, so `next build` succeeds without
them. They must still be set in Vercel for **both** Production and Preview, or
every API route will 500 at runtime.

### CSV Import Format

Guests CSV should include columns: `name`, `phoneNumber` (optional), `address` (optional)
Upload via admin interface automatically maps and validates data.

### Drag & Drop Implementation

React DnD (HTML5Backend) is now only used for **guests**: dragging a guest onto
a table, with capacity refused up front via `canSeat()`. Everything positional
on the canvas uses pointer events instead — HTML5 drag gives a ghost image, no
touch support and only a final drop position.

Keyboard shortcuts are gated on `isEditableTarget()`, which covers
contenteditable as well as input/textarea/select. Without the contenteditable
case, typing into a label fired the single-key shortcuts behind it (a "g"
toggled the grid, an "l" locked the plan).

### Database Migrations

Schema is defined in `/src/lib/schema.ts`. Migrations live in `/drizzle` and **are
committed** — the existing database was baselined against `0000_*` (its hash is
recorded in `drizzle.__drizzle_migrations`), so `db:migrate` is a no-op until a
new migration is generated.

**Migrations run themselves on deploy.** `npm run build` is
`node scripts/migrate-on-deploy.mjs && next build`, and Vercel's build is the
only hook that runs once per deployment with the database reachable, so schema
and code ship together. Generate and commit the migration (above) and the deploy
applies it — there is no manual release step.

The script:
- **skips** with exit 0 when `DATABASE_URL` is unset, so `next build` still works
  on a machine or CI runner without secrets, and when `SKIP_DB_MIGRATE=1`, the
  escape hatch for a deploy that must not touch the database
- **fails the build** when a migration fails, rather than shipping code against a
  schema that cannot answer it
- runs `drizzle-kit migrate`, which is why `pg` is a devDependency: without it
  drizzle-kit falls back to `@neondatabase/serverless` over websockets, which
  only reaches hosted Neon, and the same command could not be tested against any
  other Postgres

Preview and Production share a `DATABASE_URL`, so a preview deploy migrates the
same database. Migrations are recorded in `drizzle.__drizzle_migrations` and
applied once, but a preview of an unmerged schema change reaches production data
— use `SKIP_DB_MIGRATE=1` on that deploy if it matters.

Belt and braces: settings reads go through `readEventSettingsRow()`, which falls
back to the pre-migration columns so the portal degrades to template defaults
rather than 500ing if a database is ever behind its code. Saving settings is
blocked with a 503 until the migration runs.

For schema changes:
1. Modify `src/lib/schema.ts`
2. `npm run db:generate` — writes a new incremental migration to `/drizzle`
3. `npm run db:migrate` — applies it (commit the generated SQL alongside the code)

Prefer this over `db:push`: push diffs straight against the database and leaves no
record, which is how the schema drifted from the migration history before.

### Theme Customization

To change the color scheme, edit `/src/lib/theme.ts`:
- Modify `gradient.primary`, `gradient.background` for main colors
- Update `components.button.primary` for button styling
- All components automatically use the centralized theme via `useTheme()` hook

### Deployment Notes

- Built for Vercel deployment (serverless functions)
- Uses Neon's serverless PostgreSQL driver
- Turbopack enabled for faster builds
- Environment variables required for database and authentication