# Notra Agent

The unified eve-based agent for all Notra product work (everything except onboarding, which stays in `apps/onboarding-agent`). The root agent is the Notra assistant chat surface; content generation and image generation run as subagents.

## Architecture at a glance

```
dashboard /chat (canary, NOTRA_AGENT_CHAT=1)
  └─ /api/organizations/{orgId}/agent proxy ── auth + rate limit + AI-credit check
       └─ POST {EVE_NOTRA_AGENT_URL}/eve/v1/session   (surface: standalone-chat)

dashboard schedule/event workflows (canary, NOTRA_AGENT_CONTENT=1)
  └─ task-mode session with a delegation directive
       └─ root agent ── content-writer subagent ── create_post → Postgres

apps/api /v2/agent-chats
  └─ create / send / stream sessions 1:1 against this deployment

eve agent (this package, separate Vercel project)
  ├─ root: Notra assistant (eve autoModel: gpt-5.6-luna / claude-sonnet-5 / claude-opus-5)
  ├─ Slack: mentions, DMs, and active thread replies through /eve/v1/slack
  ├─ subagents/content-writer (anthropic/claude-sonnet-5, structured result)
  └─ subagents/image-designer (wraps the @upstash/box sandbox image pipeline)
```

Tool implementations live in `@notra/tools` (`src/assistant`, `src/content-writer`, `src/image`); this app only holds one-line adapter files, the channel, hooks, and instructions. Business logic (post persistence, image post persistence) is shared with the legacy AI SDK path via `@notra/ai/utils/post-service` and `@notra/ai/utils/image-post-service`.

## Model routing

The root agent picks its model per turn with eve's `autoModel`
(`agent/lib/utils/model.ts`), which asks the `typesafe-ai/jev` evaluation model
to choose between the options in `ASSISTANT_AUTO_MODEL_OPTIONS`: a fast model
for turns answered from general knowledge, the everyday model for anything
touching the user's content or connected data, and a deep model for long-form
or research-heavy work. The option descriptions are the entire routing policy —
the evaluator sees only them plus recent message text.

The choice is made once per turn and reused for the turn's tool-loop steps. eve
does not expose the resolved model to hooks, so the resolver records it in
session state and `getSelectedAssistantModelId` hands it to AI-credit metering
and to mirrored Slack messages. `NOTRA_JEV_CLASSIFIERS=off` skips the evaluator
and pins the agent to `ASSISTANT_MODEL_ID`.

## Authentication and tenancy

The eve channel accepts, in order: dashboard Vercel OIDC, HTTP Basic service auth (`EVE_NOTRA_AGENT_PASSWORD`, username `notra-dashboard`), same-project Vercel OIDC, and loopback local dev. Trusted callers stamp tenant scope through `x-notra-*` headers (organization, user, chat, surface, content, collection, content type, auto-publish, markup, voice, brand agent type, source metadata, generation config); the channel copies them onto the session principal and tools read them from `ctx.session.auth`, never from model input. Post creation derives a deterministic id from `(sessionId, turnId, input)` and inserts with `ON CONFLICT DO NOTHING`, so replayed steps cannot double-create posts.

Slack has its own signed webhook route and does not pass through the eve HTTP channel auth above. Workspaces connect through the dashboard integrations page: an org admin clicks Add to Slack, approves the OAuth install, and the callback stores a `slack_integrations` row binding that Slack `team_id` to their Notra organization with an encrypted per-workspace bot token. Every webhook event resolves its installation by `team_id` (60s in-process cache); outbound Slack calls resolve the same installation's token through AsyncLocalStorage context set by each handler. The dashboard manage page (`/integrations/slack`) toggles the integration and edits the per-workspace channel allowlist, which gates both inbound events and dashboard relays. The env binding (`SLACK_AGENT_TEAM_ID` + `SLACK_AGENT_ORGANIZATION_ID` + `SLACK_AGENT_BOT_TOKEN` + `SLACK_AGENT_ALLOWED_CHANNEL_IDS`) remains as a fallback for the workspace it names, and one app-level `SLACK_AGENT_SIGNING_SECRET` verifies all webhooks. The OAuth flow needs `SLACK_AGENT_CLIENT_ID` / `SLACK_AGENT_CLIENT_SECRET` on the dashboard project, with the Slack app's redirect URL set to `{dashboard URL}/api/integrations/slack/callback`. Slack user ids are not treated as Notra user ids. Public-channel threads are mirrored into the dashboard; DMs and private-channel threads remain in Slack because Notra does not yet have Slack-user-to-Notra-user access mapping.

Mirrored dashboard chats are synced in both directions. The agent publishes every mirrored message to an Upstash Realtime channel (`chat-mirror:{organizationId}:{chatId}`), and the dashboard subscribes over SSE instead of polling. Dashboard members can reply from a mirrored chat: the dashboard posts the reply into the Slack thread through the bot (prefixed with the member's name) with Slack message metadata marking it as a dashboard relay. The webhook echo of that bot post skips the normal message handlers as self-authored, and the channel's `onEvent` picks it up, verifies the team, organization, and channel allowlist, and starts a turn on the existing thread session via `receive`. The agent's reply then lands in both Slack and the dashboard. If the thread has an unanswered approval card, eve holds relayed input until the approval is resolved, matching Slack-side behavior.

Tool activity is mirrored too. The channel's `input.requested` and `action.result` handlers upsert AI SDK tool parts (`approval-requested`, then `output-available` / `output-denied` / `output-error`, outputs truncated) into the mirrored chat, so the dashboard renders the same draft preview cards and tool blocks as native chats. Approving or denying from the dashboard posts a signed synthetic Slack `block_actions` interaction to the agent webhook (`/api/organizations/{org}/chat/{chatId}/relay-approval` locates the card in the thread via `conversations.replies`), so eve resolves it exactly like a real Slack button click and updates the Slack card in place. The mirrored chat reuses the standard chat input in a Slack-relay mode (attachments and model/context controls hidden) with a link to the Slack thread resolved via `chat.getPermalink`. The dashboard project needs `SLACK_AGENT_BOT_TOKEN`, `SLACK_AGENT_SIGNING_SECRET`, and `EVE_NOTRA_AGENT_URL` alongside its existing Upstash Redis configuration.

Usage metering: hooks on the root agent and both subagents accumulate `step.completed` token usage in Redis (deduped by `(sessionId, turnId, stepIndex)`) and bill Autumn once per completed turn.

## Deploying on Vercel

1. Create a new Vercel project from this monorepo with Root Directory `apps/agent`, framework preset **Other**, build command `bun run agent:build`. No output directory override.
2. Enable OIDC federation on this project, the dashboard project, and the API project.
3. Environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Posts, collections, skills, brand data, integrations |
| `CONTEXT_DEV_API_KEY` | yes | `search_web` / `fetch_webpage` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | yes | Usage dedupe, tool caches |
| `AUTUMN_SECRET_KEY` | yes | AI-credit metering |
| `UPSTASH_BOX_API_KEY` | yes | Image generation sandbox |
| `CLOUDFLARE_ACCESS_KEY_ID` / `CLOUDFLARE_SECRET_ACCESS_KEY` / `CLOUDFLARE_S3_ENDPOINT` / `CLOUDFLARE_BUCKET_NAME` / `CLOUDFLARE_PUBLIC_URL` | yes | Generated image assets |
| `INTEGRATION_ENCRYPTION_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` | yes | GitHub/Linear/Granola integration resolution |
| `SUPERMEMORY_API_KEY` | yes | Brand reference semantic search |
| `DASHBOARD_VERCEL_TEAM_SLUG` / `DASHBOARD_VERCEL_PROJECT_NAME` | prod | Dashboard OIDC route auth |
| `API_VERCEL_PROJECT_NAME` | prod | API project OIDC route auth (same team slug) |
| `EVE_NOTRA_AGENT_PASSWORD` | fallback | Basic auth when OIDC is unavailable |
| `SLACK_AGENT_BOT_TOKEN` / `SLACK_AGENT_SIGNING_SECRET` | Slack | Bot User OAuth Token and App Credentials signing secret for the Notra Agent Slack app |
| `SLACK_AGENT_ORGANIZATION_ID` / `SLACK_AGENT_TEAM_ID` | Slack | Bind the signed Slack workspace to one Notra organization |
| `SLACK_AGENT_ALLOWED_CHANNEL_IDS` | optional | Comma-separated Slack channel ids; empty allows the whole bound workspace |

Model access needs no key on Vercel (AI Gateway OIDC); off Vercel set `AI_GATEWAY_API_KEY`.

4. Callers (dashboard and API projects) need `EVE_NOTRA_AGENT_URL` plus either OIDC federation or `EVE_NOTRA_AGENT_PASSWORD`, and the canary flags `NOTRA_AGENT_CHAT=1` / `NOTRA_AGENT_CONTENT=1` to route traffic here.

## Slack bot

The Slack transport is Eve's native Slack channel. Eve owns signed webhook verification, durable thread sessions, progress messages, and human-in-the-loop buttons while using Vercel Chat SDK card primitives for rich messages. The bot credentials belong to the Notra Slack app directly; Vercel Connect is not involved.

1. Create the Slack app in the Notra workspace and add these bot scopes: `assistant:write`, `app_mentions:read`, `chat:write`, `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:history`, and `files:read`. `assistant:write` enables Slack's App Agent experience, the history scopes support Eve's thread context, the `channels:read`/`groups:read` scopes let the app resolve channel visibility via `conversations.info` for dashboard mirroring (mention events do not carry `channel_type`), and `files:read` supports its default inbound attachment handling. Add `files:write` only when the bot needs to upload files, and `im:write` only when authorization challenges are overridden to open a new DM.
2. Under **Event Subscriptions**, set the HTTPS Request URL to `{agent deployment URL}/eve/v1/slack` and subscribe to `app_mention`, `message.im`, `message.channels`, and `message.groups`. The channel and group message events let Eve continue an active public or private channel thread without requiring another mention. Under **Interactivity & Shortcuts**, enable interactivity with the same Request URL so Eve's approval buttons work. Leave Socket Mode off.
3. Under **App Home**, enable the Messages tab and allow users to send messages to the app. Install or reinstall the app to the Notra workspace.
4. Copy the **Bot User OAuth Token** into `SLACK_AGENT_BOT_TOKEN` and the signing secret from **Basic Information → App Credentials** into `SLACK_AGENT_SIGNING_SECRET` on the agent project.
5. Set `SLACK_AGENT_ORGANIZATION_ID` and `SLACK_AGENT_TEAM_ID`. Set `SLACK_AGENT_ALLOWED_CHANNEL_IDS` for a limited rollout, then deploy the agent.
6. Mention the app in an allowed channel, or DM it when the DM channel is allowed. Once Eve owns a channel thread, ordinary replies in that thread continue the same durable session without another mention; unrelated channel messages remain ignored.

Tool approval cards in shared channels are collaborative: any Slack member who can see the card can act on it for the bound organization. Use `SLACK_AGENT_ALLOWED_CHANNEL_IDS` to limit the bot to channels whose members are trusted to approve those actions.

`SLACK_AGENT_BOT_TOKEN` is intentionally separate from the onboarding workflow's `SLACK_BOT_TOKEN`. The Slack route runs outside the dashboard/API proxy: usage hooks still meter the bound organization and public-channel Slack conversations are mirrored into read-only dashboard `chat_sessions`, but proxy rate limits, credit preflight checks, and `agent_sessions` do not apply. This is a proper workspace-installed bot bound to Notra; it is not yet a publicly installable multi-workspace implementation. Public distribution requires an OAuth install callback, encrypted per-workspace installation storage, team-aware token selection, Slack workspace-to-organization and Slack-user-to-Notra-user mappings, plus equivalent entitlement and rate-limit checks.

## Local development

`bun dev` starts the eve dev server on port 3200. Set `EVE_NOTRA_AGENT_URL=http://127.0.0.1:3200` for the dashboard/API. `GET /eve/v1/health` is public; `POST /eve/v1/session` without credentials must return 401.

Debug discovery with `bun x eve info` and `.eve/discovery/diagnostics.json`.
