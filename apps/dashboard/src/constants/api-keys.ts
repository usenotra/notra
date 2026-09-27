import {
  API_READ_SCOPES,
  API_SCOPE_RESOURCES,
  API_WRITE_SCOPES,
  getApiScopeId,
  LEGACY_API_SCOPES,
} from "@notra/utils/api-scopes";

/**
 * Scope names and resource metadata come from the shared registry in
 * `@notra/utils/api-scopes`, which `apps/api` uses to authorize requests.
 * Add new resources there, not here.
 */
export const API_KEY_PERMISSIONS = LEGACY_API_SCOPES;

export const API_KEY_GRANULAR_READ_PERMISSIONS = API_READ_SCOPES;

export const API_KEY_GRANULAR_WRITE_PERMISSIONS = API_WRITE_SCOPES;

export const API_KEY_LEGACY_PERMISSIONS = LEGACY_API_SCOPES;

export const API_KEY_GEO_SCOPES = API_SCOPE_RESOURCES.flatMap((resource) =>
  resource.openApiTag === "GEO"
    ? [getApiScopeId(resource.id, "read"), getApiScopeId(resource.id, "write")]
    : []
);

export const API_KEY_ACCESS_MODE_OPTIONS = [
  { value: "full" },
  { value: "geo" },
  { value: "restricted" },
] as const;

export const API_KEY_SCOPE_LEVEL = {
  none: "none",
  read: "read",
  write: "write",
} as const;

export const API_KEY_SCOPE_RESOURCES = API_SCOPE_RESOURCES.map((resource) => ({
  id: resource.id,
  label: resource.label,
  description: resource.description,
  readScope: getApiScopeId(resource.id, "read"),
  writeScope: getApiScopeId(resource.id, "write"),
}));

export const API_KEY_TRANSLATED_RESOURCE_IDS = [
  "posts",
  "brand-identities",
  "integrations",
  "schedules",
  "event-triggers",
  "chats",
  "skills",
  "feedback",
  "projects",
  "geo-settings",
  "prompts",
  "competitors",
  "scans",
  "visibility",
  "briefs",
  "agent-readiness",
  "traffic",
] as const;

export const API_KEY_RESOURCE_COMMON_LABEL_KEYS = {
  posts: "posts",
  "brand-identities": "brandIdentities",
  integrations: "integrations",
  schedules: "schedules",
  skills: "skills",
  projects: "projects",
} as const;

export const API_KEY_PRESET_IDS = ["mcp", "sdk", "cli"] as const;

export const API_KEY_EXPIRATION_OPTIONS = [
  { value: "never" },
  { value: "7d" },
  { value: "30d" },
  { value: "60d" },
  { value: "90d" },
] as const;

export const API_KEY_PERMISSION_SUMMARY = [
  "none",
  "read",
  "write",
  "geo",
  "custom",
] as const;

export const API_KEY_EXPIRATION_MS = {
  never: null,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "60d": 60 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
} as const;
