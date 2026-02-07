# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Notra is a content engine platform built as a Turborepo monorepo. It helps companies manage and distribute content with AI-powered tools and integrations.

## Commands

```bash
# Development
bun run dev                    # Start all apps (dashboard + web)
bun run build                  # Build all apps and packages
bun run check-types            # Type check entire monorepo
bun run format                 # Format with Prettier

# Database (Drizzle ORM + PostgreSQL)
bun run db:generate            # Generate new migration
bun run db:migrate             # Run migrations
bun run db:push                # Push schema directly (dev)
bun run db:studio              # Open Drizzle Studio GUI
bun run db:seed                # Seed test data

# Filtered commands
turbo dev --filter=dashboard   # Run only dashboard
turbo build --filter=web       # Build only web app
```

## Architecture

### Apps

- **`apps/dashboard`** - Next.js 16 app (React 19) with React Compiler enabled. Main platform with auth, content management, and AI tools. Runs on port 3000.
- **`apps/web`** - Astro static site for marketing/landing pages.

### Packages

- **`@notra/db`** - Drizzle ORM schema and database client
  - Import schema: `import { users, posts, ... } from "@notra/db/schema"`
  - Import client: `import { db } from "@notra/db/drizzle"`
- **`@notra/ui`** - Shared React component library
  - Components: `import { Button } from "@notra/ui/components/button"`
  - Kibo-UI components: `import { Component } from "@notra/ui/components/kibo-ui/component-name"`
  - Hooks: `import { useMobile } from "@notra/ui/hooks/use-mobile"`
- **`@notra/typescript-config`** - Shared TypeScript configs

### Key Technologies

- **Auth**: Better-Auth with GitHub/Google OAuth
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Vercel AI SDK + OpenRouter for multi-model support
- **Editor**: Lexical rich text editor
- **Styling**: Tailwind CSS v4
- **Data Fetching**: TanStack React Query

### Dashboard Structure

```
apps/dashboard/src/
├── app/
│   ├── (auth)/              # Protected routes
│   ├── (auth-public)/       # Login/signup
│   ├── (dashboard)/[slug]/  # Org-scoped dashboard routes
│   └── api/                 # API routes
├── components/              # React components
├── lib/
│   ├── ai/                  # AI agents, tools, prompts, skills
│   ├── auth/                # Better-Auth config
│   ├── crypto/              # Encryption utilities
│   ├── email/               # Email templates (Resend)
│   ├── integrations/        # Third-party integrations
│   ├── webhooks/            # GitHub/Linear webhook handlers
│   └── workflows/           # Workflow orchestration
└── types/
```

### Database Schema (key tables)

- `users`, `sessions`, `accounts` - Auth (Better-Auth)
- `organizations`, `members`, `invitations` - Multi-tenancy
- `posts` - Content items (being renamed to `content`)
- `githubIntegrations`, `githubRepositories` - GitHub connections
- `contentTriggers`, `repositoryOutputs` - Automation config
- `brandSettings` - Per-org branding/tone settings

## Conventions

- Package manager: Bun 1.3.6
- Node version: 24.11.1
- All database operations go through `@notra/db` package
- Use workspace protocol for internal deps: `"@notra/db": "workspace:*"`
- Environment variables loaded via `dotenv-cli` at root level
- Routes are org-scoped via `[slug]` dynamic segment
