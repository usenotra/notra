# AGENTS.md

## Cursor Cloud specific instructions

This repo is a Bun + Turborepo monorepo (product: **Notra**, an AI content-generation
platform). See `README.md` and `CONTRIBUTING.md` for the standard workflow and
`package.json` scripts for the canonical commands. Product UI follows
`https://www.usenotra.com/design.md` (`apps/web/public/design.md`).
The notes below only cover non-obvious, durable gotchas for working in the Cursor
Cloud environment.

### Toolchain
- Runtime/package manager is **Bun `1.4.0`** (installed at `~/.bun`); tooling uses
  **Node `24.11.1`** (installed via `nvm`, set as the default alias). Both are baked
  into the VM snapshot and on `PATH` in a login shell. `bun install` is the startup
  update script — do not run it manually unless deps changed.
- Quality gates (run from repo root): lint `bun run check`, types `bun run check-types`,
  build `bun run build` (use `--filter=dashboard` to scope). Husky `pre-commit` runs
  `bun format` + `bun knip`.

### Environment variables
- Scripts wrap commands in `dotenv --`, so a **root `.env` is required** (it is
  git-ignored and lives in the snapshot). If it is missing, copy `.env.example` to
  `.env` and set at minimum: `DATABASE_URL` (local Postgres, below), the WorkOS
  AuthKit vars (`WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`
  with 32+ chars), a base64-encoded **32-byte**
  `INTEGRATION_ENCRYPTION_KEY` (`openssl rand -base64 32`), and the
  `APP_URL` / `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` = `http://localhost:3000`.
- Most third-party keys are optional and degrade gracefully (Autumn billing, Resend,
  Redis, R2, integrations). GEO scanning picks up extra engines when their keys are
  set: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, and
  `CURSOR_API_KEY` (Cursor runs locally via `@cursor/sdk`, not through a gateway).
  Content/chat **generation** needs a real
  `AI_GATEWAY_API_KEY` and/or `OPENROUTER_API_KEY` — the model router picks the
  gateway per organization plan; background jobs/schedules need Upstash
  Redis + QStash. `turbo.json` uses `envMode: "strict"`, so new env vars must be added
  to its `globalEnv` list to be visible to tasks.

### Local Postgres (required for the dashboard)
- A local PostgreSQL 16 cluster is installed. Start it with:
  `sudo pg_ctlcluster 16 main start`. The `notra` database and `postgres:postgres`
  superuser are already provisioned; `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notra`.

### Database schema init gotcha (important)
- `bun run db:migrate` does **not** work on a fresh DB: the committed migration chain
  starts at `0001` and assumes base tables (e.g. `organizations`) already exist — no
  migration creates them.
- `bun run db:push` also fails on a fresh DB due to a drizzle-kit ordering bug: it emits
  composite foreign keys (e.g. `mcpSessionToolActivations_org_tool_fk` →
  `mcp_tool_index(organization_id, id)`) *before* creating the unique index they
  reference, producing `there is no unique constraint matching given keys`.
- Working approach (already applied in the snapshot; only redo if the DB is wiped):
  export the schema DDL, reorder so all `CREATE [UNIQUE] INDEX` run before
  `ALTER TABLE ... ADD ... FOREIGN KEY`, then apply with psql:
  ```bash
  bunx drizzle-kit export --config packages/db/drizzle.config.ts > /tmp/schema_init.sql
  # reorder: emit CREATE TABLE/types, then all indexes, then FK ALTERs, then:
  PGPASSWORD=postgres psql -h localhost -U postgres -d notra -v ON_ERROR_STOP=1 -f /tmp/schema_ordered.sql
  ```
  After this, `db:push` will still report a (harmless) diff because of the same
  ordering bug — that is expected and does not mean the schema is incomplete.

### Services (dev)
- `apps/dashboard` — **core product**, `next dev` on **port 3000**; self-contained
  (its own oRPC `/rpc`, Better Auth `/api/auth`, chat). Run with
  `bun run dev --filter=dashboard`. This is the app to exercise end-to-end.
- `apps/web` (port 3001), `apps/docs` (Mintlify, port 3005), `apps/api` (Hono;
  defaults to port 3000 so set `PORT` to avoid clashing with the dashboard),
  `packages/email` preview (`bun run email:dev`, port 3002) — all optional for the
  core flow.

### Auth note
- Email/password sign-up works without OAuth/email providers and does not require email
  verification. The `haveIBeenPwned` plugin rejects breached passwords, so use a strong
  unique password when signing up during tests.
