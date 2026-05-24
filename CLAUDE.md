# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**AMRTS Santorini** is a residential management dashboard for a Brazilian homeowners association. It has two frontends sharing one Convex serverless backend:

- **Root (`/app/`, `/lib/`, `/components/`)** — Modern full-featured portal (Next.js 16 App Router + TypeScript + Tailwind CSS 4). This is the primary frontend.
- **`/index.html` + `/script.js`** — Legacy SPA (pure HTML + Tailwind + Chart.js + PapaParse), deployed to GitHub Pages. Still maintained for backward compatibility.
- **`/convex/`** — Shared serverless backend (Convex): schema, auth, and all CRUD functions.

UI text, code comments, and documentation are in **Portuguese (Brazilian)**.

---

## Commands

### Next.js Frontend

```bash
npm install
npm run dev       # Dev server at http://localhost:3000
npm run build     # Production build
```

Required environment variable:
```
NEXT_PUBLIC_CONVEX_URL=https://tough-kangaroo-90.convex.cloud
```

### Convex Backend

```bash
# Run locally (hot-reload, connects to existing project)
npm run convex:dev

# Deploy backend to production
npm run convex:deploy
```

> Deploy the backend whenever any file under `convex/` changes. The GitHub Pages frontend is auto-deployed on push to `main` via GitHub Actions.

There are **no tests and no linter** configured in this project.

---

## Architecture

### Backend: Convex (`/convex/`)

The backend is entirely serverless (Convex cloud). All functions run in `convex/*.ts` — no Express, no separate API server.

**`schema.ts`** is the authoritative source of truth. It defines 11 persistent tables plus `sessions`. Every data table has a `deletedAt: optional(number)` field for soft deletes — **never hard-delete records**. Queries must always filter `deletedAt === undefined` unless intentionally fetching deleted records.

**`auth.ts`** handles all authentication:
- **CPF login** (associates/residents): validates CPF against the `associates` table; auto-creates a `users` record on first login.
- **Email+password login** (diretoria/sysadmin): validates SHA-256 password hash against `users`.
- Sessions: 64-char random hex token, 8-hour TTL, stored in the `sessions` table.
- Every mutation that requires authorization calls `requireRole(ctx, sessionToken, minimumRole)`. The role hierarchy is `sysadmin > diretoria > associado > morador`.

The Convex-generated type file (`_generated/`) is **not committed**. It is produced at runtime by `npx convex dev` or `npx convex deploy`.

### Next.js Frontend (raiz do repositório)

**⚠️ This project uses Next.js 16, which has breaking changes from prior versions.** Before writing Next.js code, check `node_modules/next/dist/docs/` for current APIs and conventions.

**Data fetching** does NOT use the Convex React SDK's real-time subscriptions. Instead, `lib/convex.ts` provides three plain HTTP helpers that call Convex's HTTP API directly:
- `convexQuery(path, args)` — calls `POST /api/query`
- `convexMutation(path, args)` — calls `POST /api/mutation`
- `useConvexQuery(path, args, skip?)` — React hook wrapping `convexQuery` with `useState`/`useEffect`. Pass `skip=true` until the session is loaded.

There is a `ConvexClientProvider` component but the actual page-level data fetching uses the helpers above, not `useQuery`/`useMutation` from `convex/react`.

**Authentication** is handled by `lib/auth.tsx`:
- `AuthProvider` (wraps the app) reads the session token from cookie `santorini_session`.
- `useAuth()` hook returns `{ user, sessionToken, isLoading, login, logout }`.
- Always pass `sessionToken` in mutation args. Always pass it in query args when the backend requires a session (admin or portal pages).

**Route structure** (from `nextjs/DEPLOY.md`):

| Path | Access |
|---|---|
| `/` | Public (anonymized financial overview) |
| `/login` | Public |
| `/portal/*` | Any authenticated user |
| `/admin/*` | `diretoria` role or above |
| `/admin/usuarios` | `sysadmin` only |

### Privacy / Data Masking

- `associates.cpf` (full CPF) is only returned to admins. The portal exposes `associates.cpfPrefix` only.
- Transaction names are anonymized for public view ("Associado 042" / "Despesa 07"); real names are shown to the authenticated associate or to admins.
- CSV files containing financial or personal data are excluded via `.gitignore` and must never be committed.

### First Sysadmin Seed

To bootstrap a new deployment, run mutation `auth:seedFirstSysadmin` from the Convex dashboard with the guard key `SANTORINI_SEED_2026`. Generate the `passwordHash` with:
```bash
echo -n "YourPassword" | sha256sum
```

---

## Key Conventions

- **Soft deletes everywhere**: set `deletedAt = Date.now()` instead of calling `db.delete()`.
- **Deduplication keys**: transactions use `transactionKey` (composite of `date|time|value|type`); associates upsert by CPF or exact name.
- **Date formats**: stored as ISO strings (`YYYY-MM-DD`). CSV import accepts `dd/mm/yyyy` and converts on import.
- **Role checks**: add `await requireRole(ctx, args.sessionToken, "diretoria")` at the top of any mutation that modifies data.
- **`useConvexQuery` + `skip`**: always gate queries that need a session behind `skip={!sessionToken}` to avoid unauthenticated calls on first render.
