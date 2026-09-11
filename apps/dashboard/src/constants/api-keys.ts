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
  {
    value: "full",
    label: "Full Access",
    title: "Full Access",
    description:
      "This key grants full access to all API resources. For better security, we recommend creating a restricted key.",
  },
  {
    value: "geo",
    label: "GEO Access",
    title: "GEO Access",
    description:
      "This key grants read and write access to GEO resources only. All other API resources remain restricted.",
  },
  {
    value: "restricted",
    label: "Restricted",
    title: "Resource access",
    description:
      "Set read and write access individually for every API resource.",
  },
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

export const API_KEY_PRESET_IDS = ["mcp", "sdk", "cli"] as const;

export const API_KEY_EXPIRATION_OPTIONS = [
  { label: "No expiry", value: "never" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "60 days", value: "60d" },
  { label: "90 days", value: "90d" },
] as const;

export const API_KEY_PERMISSION_LABELS = {
  "api.read": "Read only",
  "api.write": "Read & write",
} as const;

export const API_KEY_PERMISSION_SUMMARY = {
  none: "No access",
  read: "Read only",
  write: "Read & write",
  geo: "GEO access",
  custom: "Custom",
} as const;

export const API_KEY_SCOPE_LEVEL_LABELS = {
  none: "None",
  read: "Read",
  write: "Write",
} as const;

export const API_KEY_EXPIRATION_MS = {
  never: null,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "60d": 60 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
} as const;
