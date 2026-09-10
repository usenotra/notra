import { markdownResponse } from "@/utils/http";
import { API_URL, DOCS_URL, SITE_URL } from "@/utils/urls";

const API_LLMS = `# Notra API

Notra's public API is served from ${API_URL}. Use it when an agent needs to read generated content, create drafts, manage schedules, apply reusable writing skills, or run GEO workflows — tracking AI-engine mentions, AI traffic, content gaps, and briefs — for an authenticated organization.

## Discovery

- OpenAPI: [${API_URL}/openapi.json](${API_URL}/openapi.json)
- API catalog: [${SITE_URL}/.well-known/api-catalog](${SITE_URL}/.well-known/api-catalog)
- Integration surfaces: [${SITE_URL}/.well-known/integrations.json](${SITE_URL}/.well-known/integrations.json)
- Authentication guide: [${SITE_URL}/auth.md](${SITE_URL}/auth.md)
- Developer docs: [${DOCS_URL}](${DOCS_URL})

## Authentication

Send \`Authorization: Bearer <NOTRA_API_KEY>\`. Unauthenticated API requests return \`WWW-Authenticate\` with protected-resource metadata.

## Core Endpoints

- \`GET /v1/status\` checks public API reachability.
- \`GET /v1/posts\` lists generated posts for the authenticated organization.
- \`POST /v1/posts/generate\` queues async content generation; \`GET /v1/posts/generate/{jobId}\` polls its status.
- \`GET /v1/brand-identities\` lists saved brand voices.
- \`GET /v1/skills\` lists reusable writing skills.
- \`GET /v1/schedules\` and \`/v1/event-triggers\` manage scheduled and event-based generation.
- \`GET /v1/chats\` lists chat sessions; \`POST /v2/eve/v1/session\` starts a durable agent session.
- \`POST /v1/feedback/{organizationSlug}\` accepts public agent feedback without credentials.
- \`GET /v1/projects\` lists GEO projects; project-scoped \`/v1/projects/{projectId}/geo/*\` endpoints cover prompts, scans, visibility, competitors, content gaps and briefs, agent readiness, and AI traffic.
`;

export function GET() {
  return markdownResponse(API_LLMS);
}
