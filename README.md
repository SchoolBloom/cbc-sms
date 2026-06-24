# SchoolBloom

A calmer way to run CBC assessment.

SchoolBloom is a unified, CBC-aligned school management system designed specifically for Kenyan primary, junior secondary, and senior secondary school systems. It streamlines school administration, manages continuous longitudinal competency-based assessments, and handles pathways preferences and allocations for junior secondary learners.

## Core Modules & Features

- **School Onboarding & Administration (SuperAdmin Portal):** Global registration and monitoring of schools and provisioning initial school administrators.
- **Learners Registry:** Core student directory requiring complete details including NEMIS UPI, KNEC Assessment Numbers, and mandatory Birth Certificate Numbers.
- **Classes & Teacher Management:** Grade structure planning (streams, terms) and teacher allocations.
- **SBA Tasks (Subject Assignments):** Mapping teachers to specific subjects and streams across standard CBC learning areas.
- **Continuous Assessment Logs:** Multi-term longitudinal evaluation tracking. Records learner progress against KICD Strands and Sub-strands using the standard CBC rubric levels (*Exceeds Expectation*, *Meets Expectation*, *Approaches Expectation*, *Below Expectation*).
- **Secondary Pathway Allocations:** Standardized allocation workflow for Junior Secondary transitions into Senior Secondary pathways (STEM, Social Sciences, Arts & Sports) based on pathway preferences, performance metrics, and appeal workflows.

## Role-Based Access Controls (RBAC)

The system supports four distinct roles, strictly enforcing permissions and dashboards:

1. **System Administrator (SuperAdmin):** Platform-level manager of schools, global profiles, and school roles.
2. **School Administrator:** School-level configuration manager for learners, teachers, classes, academic terms, and parent-student linkages.
3. **Teacher:** Educator workspace to manage classrooms, design SBA Tasks, and record continuous assessment metrics.
4. **Parent:** Guardian dashboard to view assessments, qualitative feedback, child growth indicators, and manage pathway preferences/appeals.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn-ui
- **State Management & Queries:** TanStack React Query v5
- **Backend / Database:** Supabase (Auth, Postgres, RLS policies, triggers, and RPC procedures)
- **Local Dev Server:** Node.js (Vite)

## Database Schema & Migrations

Database tables are configured with Row-Level Security (RLS) policies to protect school-specific data tenancy. The complete database schema is consolidated in a single initialization script:

To prevent RLS policy recursion, the schema utilizes security-definer helper functions (`is_system_admin`, `is_school_admin`) which bypass policy recursion loops on the `user_roles` table.

## Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Supabase account & project

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

### 3. Install Dependencies & Run Dev Server
```bash
# Install dependencies
npm install

# Start Vite local development server
npm run dev
```

### 4. Running Tests
To run database and layout verification tests:
```bash
npm run test
```
