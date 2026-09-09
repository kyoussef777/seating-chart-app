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
- `tables` - Seating arrangements with position coordinates
- `guests` - Guest information, party size, optional table assignment
- `labels`, `shapes`, `referenceObjects` - Floor-plan decoration layer

Key relationship: `guests.tableId` → `tables.id` (nullable, cascades to null on delete)

### Application Structure

**Dual Interface Design:**
- **Guest Portal** (`/`): Autocomplete search, table lookup, optional address
  collection, rendered by one of three event templates
- **Admin Dashboard** (`/admin`): Seating chart, Roster, guest management, CSV import

**Admin tabs:** Seating Chart (spatial floor plan), Roster (who is sitting with
whom — drag guests between tables and the unassigned list), Guest List, Event
Settings (template picker, event copy, guest-facing toggles, live preview),
User Management. Both seating views share `src/lib/seating.ts`, which
owns capacity maths, canvas bounds and assignment persistence.

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
- React DnD implementation with zoom/pan controls
- Real-time table positioning with pixel accuracy
- Visual capacity management and guest assignments
- Transform-based zoom (30%-200%) with pan offset handling

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

Uses React DnD with HTML5Backend:
- Tables are draggable with position persistence
- Drop zones account for zoom/pan transforms
- Guest-to-table assignments via drag operations
- Visual feedback for capacity limits

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