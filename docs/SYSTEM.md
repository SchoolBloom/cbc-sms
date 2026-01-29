# School Bloom System Documentation

## Overview
School Bloom is a CBC-aligned school management system for Kenyan primary and junior secondary schools. The web app is built with React, TypeScript, Vite, and Tailwind, and uses Supabase for auth and data storage. A lightweight Node/Express server handles outbound email for published notices.

## Architecture
- Frontend: React + React Router, state and data access via React Query and Supabase client.
- Backend data: Supabase Postgres (tables, auth, storage), with typed client bindings in `src/integrations/supabase/types.ts`.
- Email service: Express server in `server/index.js` that sends notice emails using SMTP and Supabase service role access.

High-level flow:
1. User authenticates with Supabase auth.
2. `AuthContext` loads session and profile data.
3. `RoleContext` loads role-specific data and permissions.
4. Routes gate access based on role and login state.
5. Pages query Supabase tables via the client and React Query.
6. Notice publishing can trigger email delivery through the Express server.

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui
- React Router
- React Query
- Supabase (auth + database)
- Express + Nodemailer (notice email server)

## App Structure
- `src/main.tsx`: application bootstrap.
- `src/App.tsx`: providers, routes, and access control.
- `src/contexts/AuthContext.tsx`: auth session and sign-in/up/out.
- `src/contexts/RoleContext.tsx`: role-based data and permissions.
- `src/pages/*`: feature pages (dashboard, students, fees, etc).
- `src/components/*`: shared UI and domain components.
- `src/integrations/supabase/*`: Supabase client and generated types.
- `server/index.js`: notice email sender.

## Authentication and Session
- Authentication is handled by Supabase.
- `AuthContext` listens for auth state changes, fetches profile + role, and exposes `signIn`, `signUp`, and `signOut`.
- Inactivity auto-signout is enforced (30 minutes) to reduce stale sessions.
- `PublicRoute` blocks authenticated users from login routes.
- `ProtectedRoute` requires an authenticated user for all private pages.

## Roles and Permissions
Roles are defined in `RoleContext`:
- admin
- teacher
- parent
- bursar

Permission checks are centralized in `RoleContext` and used for page/action gating.

Role permissions overview:
- admin: full access to students, classes, attendance, assessments, fees, parents, notices, reports, settings
- teacher: read students/classes, manage attendance + assessments, read parents/notices/reports
- parent: read students (own), attendance, assessments, fees, notices, reports
- bursar: manage fees, read students/parents, generate reports

Parent-specific data:
- The context resolves parent records, links to children, and keeps a selected child state.

## Routing
Routes are defined in `src/App.tsx`:
- `/login` (public)
- `/awaiting-allocation` (post-signup holding page)
- `/` (dashboard, role gated)
- `/students` (admin)
- `/classes` (admin, teacher)
- `/attendance` (admin, teacher, parent)
- `/assessments` (admin, teacher, parent)
- `/fees` (admin, parent, bursar)
- `/parents` (admin, teacher, bursar)
- `/teachers` (admin)
- `/notices` (admin, teacher, parent)
- `/calendar` (admin, teacher, parent, bursar)
- `/reports` (admin, teacher, parent, bursar)
- `/assignments` (admin)
- `/subjects` (redirects to /assignments)
- `/settings` (admin)

Default route logic:
- If a user has no role yet, they are redirected to `/awaiting-allocation`.
- All assigned roles currently route to `/` (dashboard) by default.

## Core Modules (Pages)
- Dashboard: role-specific overview.
- Students: student registry and details.
- Classes: class structure and assignments.
- Attendance: daily attendance records.
- Assessments: CBC learning areas and performance tracking.
- Fees: invoices and payment status.
- Parents: guardian profiles and relationships.
- Teachers: staff management.
- Notices: publish announcements to audiences.
- Reports: downloadable/summary reports.
- Calendar: events and key dates.
- Settings: configuration (admin).

## Data Model (Supabase)
Tables and key entities (from `src/integrations/supabase/types.ts`):
- `students`: learner profiles with class links and parent relations.
- `classes`: grade/stream/term records.
- `teachers`: teacher profiles.
- `parents`: guardian profiles.
- `attendance`: daily attendance per student.
- `assessments`: CBC assessments and performance levels.
- `fees`: billing and payments.
- `notices`: school announcements with audience targeting.
- `events`: calendar events.
- `profiles`: user profile data (full name).
- `user_roles`: user role mapping.

Database functions:
- `get_user_role`
- `has_role`

## Notices and Email Delivery
- The Notices page loads and filters by role:
  - Parents only see published notices targeted to parents or all.
  - Staff can view drafts and published items.
- The Express server provides:
  - `GET /api/health`
  - `POST /api/notices/:id/email` to send email to the notice audience.
- Email delivery uses SMTP and batches recipients to avoid large single sends.

## Environment Variables
Client (Vite):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server (`server/.env.server` expected by `server/index.js`):
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE`
- `SMTP_REPLY_TO`
- `CORS_ORIGIN`
- `SERVER_PORT`

## Local Development
Frontend:
- `npm run dev` (or `bun dev` if using Bun)

Email server:
- `npm run dev:server`

Build:
- `npm run build`

Tests:
- `npm run test`

## Operational Notes
- Supabase service role key is required for the notice email server.
- The notice email endpoint only sends for published notices.
- CORS is configurable via `CORS_ORIGIN` (comma-separated list).

## Known Gaps / TODOs
- Default role routing is the same for all roles; add role-specific landing pages if desired.
- Add rate-limiting or queueing to the notice email server for larger schools.
- Add role assignment workflow after signup.
