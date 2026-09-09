import { PUBLIC_API_SCOPES } from "@notra/utils/api-scopes";

import { SITE_DESCRIPTION } from "@/utils/metadata";
import { SOCIAL_LINKS } from "@/utils/social-links";
import { API_URL, DOCS_URL, MCP_URL, SITE_URL } from "@/utils/urls";

const AGENT_DISCOVERY_PATHS = {
  agentJson: "/.well-known/agent.json",
  agentCard: "/.well-known/agent-card.json",
  apiCatalog: "/.well-known/api-catalog",
  authMarkdown: "/auth.md",
  botAuthDirectory: "/.well-known/http-message-signatures-directory",
  feedbackMarkdown: "/feedback.md",
  mcp: "/.well-known/mcp",
  oauthProtectedResource: "/.well-known/oauth-protected-resource",
  schemaMap: "/schema-map.xml",
} as const;

export const NOTRA_CONTACT_EMAIL = "hello@usenotra.com";
export const NOTRA_SUPPORT_EMAIL = "support@usenotra.com";

export const NOTRA_SAME_AS = [
  SOCIAL_LINKS.github,
  SOCIAL_LINKS.x,
  SOCIAL_LINKS.linkedin,
  SOCIAL_LINKS.youtube,
  SOCIAL_LINKS.reddit,
] as const;

export const NOTRA_CAPABILITIES = [
  "Track how often ChatGPT, Claude, Gemini, Perplexity and other AI engines mention a brand for tracked buyer prompts",
  "Report share of voice against tracked competitors, per prompt, engine and language",
  "Attribute AI agent traffic on a website by purpose: training, search index, cited in answer or referral",
  "Find content gaps and plan or write articles for prompts where the brand is missing",
  "Score a website's agent readiness and collect agent feedback through a public endpoint",
  "Draft changelogs, launch posts and social updates in a saved brand voice",
  "Read and manage projects, prompts, scans and posts through the Notra API and MCP tools",
] as const;

export function siteUrl(path = "") {
  return `${SITE_URL}${path}`;
}

export function apiUrl(path = "") {
  return `${API_URL}${path}`;
}

function authIssuerUrl() {
  return "https://oauth.usenotra.com";
}

function buildAgentAuthMetadata() {
  return {
    register_uri: `${authIssuerUrl()}/oauth2/register`,
    authorization_uri: `${authIssuerUrl()}/oauth2/authorize`,
    token_uri: `${authIssuerUrl()}/oauth2/token`,
    device_authorization_uri: `${authIssuerUrl()}/oauth2/device_authorization`,
    revocation_uri: `${authIssuerUrl()}/oauth2/revoke`,
    skill: siteUrl(AGENT_DISCOVERY_PATHS.authMarkdown),
    credential_types_supported: ["api_key", "bearer"],
    api_key: {
      issuance: "Create a scoped API key in the Notra dashboard",
    },
  };
}

export function buildProtectedResourceMetadata() {
  return {
    resource: apiUrl(),
    authorization_servers: [authIssuerUrl()],
    scopes_supported: PUBLIC_API_SCOPES,
    bearer_methods_supported: ["header"],
    resource_documentation: siteUrl(AGENT_DISCOVERY_PATHS.authMarkdown),
  };
}

export function buildAgentJson() {
  return {
    name: "Notra",
    title: "Notra Agent Discovery",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    icon: siteUrl("/notra-mark.svg"),
    category: "Generative engine optimization (GEO)",
    docs: DOCS_URL,
    api: {
      base_url: API_URL,
      openapi: apiUrl("/openapi.json"),
      catalog: siteUrl(AGENT_DISCOVERY_PATHS.apiCatalog),
      auth: siteUrl(AGENT_DISCOVERY_PATHS.authMarkdown),
      status: apiUrl("/v1/status"),
    },
    mcp: {
      streamable_http: MCP_URL,
      webmcp: siteUrl(AGENT_DISCOVERY_PATHS.mcp),
      docs: `${DOCS_URL}/devtools/mcp`,
    },
    capabilities: NOTRA_CAPABILITIES,
    auth: buildAgentAuthMetadata(),
    feedback: {
      markdown: siteUrl(AGENT_DISCOVERY_PATHS.feedbackMarkdown),
      endpoint: apiUrl("/v1/feedback/notra"),
      docs: `${DOCS_URL}/api/agent-feedback`,
    },
    contact: {
      email: NOTRA_CONTACT_EMAIL,
      support: NOTRA_SUPPORT_EMAIL,
    },
    sameAs: NOTRA_SAME_AS,
  };
}
