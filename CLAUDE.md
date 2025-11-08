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
The application uses Drizzle ORM with four main tables:
- `users` - Admin authentication
- `eventSettings` - Event configuration (name, homepage text)
- `tables` - Seating arrangements with position coordinates
- `guests` - Guest information with optional table assignments

Key relationship: `guests.tableId` → `tables.id` (nullable, cascades to null on delete)

### Application Structure

**Dual Interface Design:**
- **Guest Portal** (`/`): Autocomplete search, table lookup, address collection
- **Admin Dashboard** (`/admin`): Drag-and-drop seating chart, guest management, CSV import

**API Routes:**
- `/api/auth/*` - JWT authentication (login, logout, session validation)
- `/api/guests` - CRUD operations, CSV import, table assignments (PII protected for public)
- `/api/guests/details` - Single guest lookup with address (for guest themselves)
- `/api/tables/*` - Table management with positioning
- `/api/settings/*` - Event configuration
- `/api/users/*` - Admin user management (create, update, delete)

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

**Guest Search (`/src/app/page.tsx`):**
- Real-time autocomplete with keyboard navigation
- Shows guest names with table assignments
- Handles assigned/unassigned visual indicators

### Authentication Flow

1. Admin login via `/admin/login` → JWT token in HTTP-only cookie
2. Session validation on admin routes via `/api/auth/me`
3. Token expires after 24 hours
4. Password hashing with bcrypt (12 salt rounds)

### Environment Setup

Required environment variables:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secure token signing key

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

Schema is defined in `/src/lib/schema.ts`. For schema changes:
1. Modify schema file
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply (production)
4. Or `npm run db:push` for direct schema push (development)

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