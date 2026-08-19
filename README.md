# Tu Linh Management Backend

Management Dashboard backend — **Phase 1**: authentication, admin authorization, and user management, backed by Supabase.

> **Scope note:** Timekeeping and Ronald Jack ADMS integration are intentionally **not** implemented in this phase. The modular architecture (`src/modules/*`) is structured so those features can be added later without reworking the existing code.

## Tech Stack

- **Node.js** ≥ 20, **Express** 4.21, **TypeScript** 5.6 (strict, ESM)
- **Supabase** (`@supabase/supabase-js`) for Auth + Postgres
- **Zod** for validation, **ESLint 9** + **Prettier** for quality, **Vitest** + **supertest** for testing
- **helmet**, **cors**, **express-rate-limit**, **morgan**, **swagger-jsdoc** + **swagger-ui-express**

## Prerequisites

- Node.js ≥ 20
- A Supabase project (Auth + Postgres)

## Installation

```bash
npm install
```

## Environment Setup

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | HTTP port (default `3000`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (respects RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (bypasses RLS — backend only, never expose) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (respects RLS) |
| `SUPABASE_SECRET_KEY` | Secret key (bypasses RLS — backend only, never expose) |
| `CORS_ORIGIN` | Comma-separated allowed origins (default `http://localhost:3001`) |

## Database Setup

Run the migrations in order in the Supabase SQL editor (or via the Supabase CLI):

1. `database/migrations/001_create_profiles.sql` — creates the `profiles` table, indexes, `updated_at` trigger, and an auto-provisioning trigger for new auth users.
2. `database/migrations/002_profiles_rls.sql` — enables Row Level Security with a self-read/self-update policy.
3. `database/migrations/003_first_admin.sql` — optional SQL helper for the first admin (see below).

## First Admin Setup

The first administrator must be created manually (no hard-coded credentials exist in the codebase).

1. In the Supabase Dashboard, create the admin user: **Authentication → Users → Add user** (set a strong password).
2. Promote that user to admin using the CLI helper:

```bash
npm run create-admin -- --email admin@example.com --full-name "Administrator" --employee-code ADMIN001
```

Alternatively, run `database/migrations/003_first_admin.sql` with the user's UUID and email filled in.

## Development

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

- Health check: `GET /health`
- API docs (Swagger UI): `http://localhost:3000/api/docs`

## Build & Production

```bash
npm run build
npm start
```

## Testing

```bash
npm test          # run once
npm run test:watch
```

## Lint & Format

```bash
npm run lint
npm run format
```

## API Overview

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | — | Log in an administrator |
| `GET` | `/api/v1/auth/me` | Bearer | Current user's profile |
| `POST` | `/api/v1/auth/logout` | Bearer | End the session |
| `GET` | `/api/v1/users` | Admin | List users (pagination/search/filter/sort) |
| `GET` | `/api/v1/users/:id` | Admin | Get a user |
| `POST` | `/api/v1/users` | Admin | Create a user |
| `PATCH` | `/api/v1/users/:id` | Admin | Update a user |
| `PATCH` | `/api/v1/users/:id/status` | Admin | Activate/deactivate a user |

## Project Structure

```
src/
  config/          env validation, Supabase clients, Swagger
  middleware/      auth, admin, validation, error, not-found
  modules/
    auth/          controller, service, routes, schema, types
    users/         controller, service, routes, schema, types
  routes/          API route aggregator
  types/           shared types + Express augmentation
  utils/           logger, AppError, API response helpers
  app.ts           Express app assembly
  server.ts        entry point
database/
  migrations/      SQL migrations + RLS policies
scripts/
  create-admin.ts  first-admin CLI helper
```

## Security Notes

- The **service-role** client (`supabaseAdmin`) is used only in the backend service layer for privileged operations (creating/deleting auth users). It is never exposed to clients.
- The **anon** client (`supabase`) respects Row Level Security and is used for login/logout and token validation.
- Passwords, tokens, and service-role keys are never logged.