# Notra Onboarding Agent

The eve-based agent that researches a new organization's company (website, socials, GitHub), persists brand data, references, memories, and onboarding suggestions, and tunes the org's content skills. This document covers how to deploy it, how it is wired into signup, and how it behaves with many organizations hitting it at once.

## Architecture at a glance

```
User signs up, enters website
        │
        ▼
dashboard: triggerOnboardingAgentSetup (server action)
  - validates email is not disposable (mailchecker)
  - resolves the company domain: website first, business email as fallback
  - rejects free-mail domains (gmail.com etc., free-email-domains-list)
  - verifies the website responds
        │
        ▼
Vercel Workflow: onboardingAgentWorkflow (src/workflows/onboarding-agent.ts, dashboard deployment)
  - sends the Slack Connect invite when the workflow starts
  - start-session: POST {EVE_ONBOARDING_AGENT_URL}/eve/v1/session
  - polls organizations.onboarding_agent_ran every 30s
  - 15 min soft limit (logged), 30 min hard limit (logged as timed out)
        │
        ▼
eve agent (this package, separate Vercel project)
  - durable session runs researcher + skill-editor subagents
  - writes brand data, references, suggestions, skills to Postgres
  - run-status hook flips organizations.onboarding_agent_ran on completion
```

The agent is a standalone eve server. It is not part of the dashboard's Next.js build; the dashboard talks to it over HTTP.

## Deploying on Vercel

### 1. Create a second Vercel project

1. In Vercel, add a new project from the same monorepo.
2. Set the **Root Directory** to `apps/onboarding-agent`.
3. Framework preset: **Other**. Build command: `bun run agent:build` (`eve build`). No output directory override is needed: when `VERCEL` is set, `eve build` emits a [Vercel Build Output](https://vercel.com/docs/build-output-api) bundle under `.vercel/output`, and eve's workflow execution runs on Vercel Workflow.
4. Enable **OIDC federation** on both this project and the dashboard project (Project Settings → Security) so the dashboard can authenticate with short-lived Vercel tokens instead of a static secret.

### 2. Environment variables (agent project)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Direct Postgres access for skills, brand data, suggestions, and the ran flag |
| `SUPERMEMORY_API_KEY` | yes | Organization memory |
| `CONTEXT_DEV_API_KEY` | yes | Website scraping, brand lookup, web search |
| `TWITTER_BEARER_TOKEN` | no | Higher-fidelity X API data for `fetch_recent_tweets`; Context.dev web research is used when unset |
| `GITHUB_TOKEN` | no | Higher GitHub rate limits for repo/activity tools |
| `DASHBOARD_VERCEL_TEAM_SLUG` | prod | Vercel team slug of the dashboard project (OIDC route auth) |
| `DASHBOARD_VERCEL_PROJECT_NAME` | prod | Vercel project name of the dashboard (OIDC route auth) |
| `EVE_ONBOARDING_AGENT_PASSWORD` | fallback | Shared secret for HTTP Basic auth when OIDC is not used |
| `CLOUDFLARE_ACCESS_KEY_ID` | prod | R2 credentials for private reference snapshots |
| `CLOUDFLARE_SECRET_ACCESS_KEY` | prod | R2 credentials for private reference snapshots |
| `CLOUDFLARE_S3_ENDPOINT` | prod | R2 S3 endpoint |
| `CLOUDFLARE_BUCKET_NAME` | prod | Private bucket containing full-Markdown reference snapshots |

Model access needs no key on Vercel: the agent uses gateway model ids (`openai/gpt-6-sol`, `anthropic/claude-sonnet-5`) which authenticate through the linked project's Vercel AI Gateway OIDC. Off Vercel, set `AI_GATEWAY_API_KEY`.

### 3. Environment variables (dashboard project)

| Variable | Required | Purpose |
| --- | --- | --- |
| `EVE_ONBOARDING_AGENT_URL` | yes | The agent deployment's URL (https) |
| `EVE_ONBOARDING_AGENT_PASSWORD` | fallback | Same value as on the agent when not using OIDC |
| `QSTASH_TOKEN` | yes | Already set; triggers the Upstash workflow |
| `SLACK_BOT_TOKEN` | optional | Slack Connect invite when the workflow starts; skipped when unset |
| `SLACK_FOUNDER_MEMBER_ID` | with Slack | Slack workspace member ID added to every onboarding Slack Connect channel |

With OIDC federation enabled, the dashboard automatically sends its `VERCEL_OIDC_TOKEN` as a Bearer token and you can drop `EVE_ONBOARDING_AGENT_PASSWORD` on both sides entirely.

### 4. Verify the deployment

```bash
curl https://<agent-deployment>/eve/v1/health        # 200, public
curl -X POST https://<agent-deployment>/eve/v1/session \
  -H 'content-type: application/json' -d '{"message":"ping"}'   # 401 without credentials
```

The 401 is the point: route auth fails closed. Only three callers get in — the dashboard (OIDC subject or Basic secret), same-project Vercel OIDC tokens (eve's internal runtime callers), and loopback requests in local dev.

## Authentication and tenancy

- The dashboard authenticates as a **service**, not as the end user. Route auth (`agent/channels/eve.ts`) verifies either a Vercel OIDC token matching the dashboard project's subject or the shared Basic secret.
- The organization is passed in the `x-notra-organization-id` header and stamped onto the session's auth principal. Every DB tool reads it via `requireOrganizationId(ctx)`; the model never supplies an organization id, so prompt injection from scraped websites cannot redirect writes to another tenant.
- Authorization (may this user run onboarding for this org?) happens in the dashboard before the agent is ever called: session check, org membership check, rate limit.

## How multiple instances and clients work

**One deployment serves every organization.** There is no per-client agent instance to spin up:

- Each signup creates one **durable eve session**, keyed by a `sessionId` and bound to one organization via the auth attributes above. Sessions are fully isolated from each other: separate conversation state, separate event streams, separate subagent children.
- On Vercel the agent runs as serverless functions on Vercel Workflow. Concurrent sessions scale horizontally like any serverless workload — 50 signups at once means 50 independent durable sessions progressing in parallel, subject to your Vercel plan's concurrency limits and the model provider's rate limits, not to any per-instance capacity of the agent.
- Session state is persisted by eve's runtime (not in process memory), so a function instance dying mid-run does not lose the run; the workflow resumes.
- Each org's data writes are scoped by the session's organization id, and Supermemory is partitioned per organization by container tag. Nothing is shared between concurrent runs except code.
- Model throughput is the practical bottleneck under load: every run makes many gateway calls (GPT-6 Sol + Sonnet). If signups spike, runs queue at the provider rate limit and simply take longer; the 15-minute target is per-run, not global.
- The completion hook resolves the organization from Eve's durable session-auth snapshot, not process memory, so it survives workflow step boundaries and serverless instance recycling.
- External research reads retry transient network, rate-limit, and 5xx failures with bounded exponential backoff. Permanent 4xx and validation errors fail immediately so the agent can record the unavailable source and continue.
- Side-effecting database tools are replay-safe: brand colors already use an atomic row lock, and references and suggestions deduplicate under an organization-scoped lock before inserting.

## Signup wiring

`submitWorkspaceForm` (dashboard) fires `triggerOnboardingAgentSetup` in the background after the org is created. That action:

1. Requires an authenticated member of the org and rate-limits per org.
2. Skips if the agent already ran or is running for this org (`organizations.onboarding_agent_ran` / `onboarding_agent_started_at`).
3. Resolves the company domain: the entered website wins; if it's missing or a free-mail domain (gmail.com, outlook.com, ... via `free-email-domains-list`), it falls back to the signup email's domain — but only when that email is not disposable (mailchecker) and not itself a free provider. Gmail signups without a website simply skip the agent.
4. Checks the website actually responds (HEAD/GET with a 5s timeout).
5. Triggers the Upstash workflow with `{ organizationId, domain, email, organizationName }`.

When the workflow starts, it creates a Slack Connect channel `ext-<company-name>-notra`, adds the configured founder, and invites the signup email with permission to post and invite only when it is not from a free provider. The email and website domains do not need to match. Slack setup is skipped unless both Slack variables are set. If an invite fails, the failure is caught and does not fail the workflow.

## Local development

`bun dev` at the repo root starts the agent on `http://127.0.0.1:3100` next to the apps (turbo runs this package's `dev` script). The dashboard's `/eve/v1/*` rewrite proxies to it. Local requests authenticate via eve's loopback `localDev()` fallback; org-scoped tools require going through the workflow path (or setting `EVE_ONBOARDING_AGENT_PASSWORD` locally) so the org header gets stamped.

Social/editorial research fetches 25 to 50 original tweets and up to 50 owned
blog or newsroom pages. The root agent bulk-imports deduplicated brand
references when enough credible material exists, targeting at least 25 with no
upper cap; every candidate that clears the quality bar is saved. Bulk imports
retain canonical source URLs, carry author/title/date/engagement display
metadata, insert in fixed-size chunks, and run under the same
organization-scoped transaction lock as single-reference writes.
