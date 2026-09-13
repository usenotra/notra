/**
 * Single source of truth for Notra public-API scopes.
 *
 * Everything that talks about public-API permissions derives from
 * `API_SCOPE_RESOURCES`:
 * - `apps/api` resolves the required scope for an incoming request and
 *   advertises `scopes_supported` in its agent-discovery metadata.
 * - `apps/dashboard` renders the API-key scope picker and validates submitted
 *   scopes.
 * - `apps/web` advertises `scopes_supported` in its protected-resource
 *   metadata.
 *
 * HOW TO ADD A RESOURCE
 * 1. Append an entry to `API_SCOPE_RESOURCES` with `id`, `paths`, `label` and
 *    `description` (plus `pathPatterns` when the resource lives under a nested
 *    path with an id segment, and `legacyOrganizationSegments` only when the
 *    resource still answers on `/v1/{organizationId}/...`).
 * 2. Nothing else. Scope ids (`<id>.read` / `<id>.write`), the request →
 *    scope resolver, the UI groups, the accepted-scope allow list and the
 *    legacy `api.read` / `api.write` expansion are all derived from it.
 *
 * Keep this module dependency-free: it is imported by a Next.js client bundle,
 * a Hono worker and plain Node tests.
 */

export type ApiScopeAccess = "read" | "write";

export interface ApiScopeResourceDefinition {
  /** Stable resource id. Doubles as the prefix of its scope ids. */
  readonly id: string;
  /**
   * Path prefixes (after the `/v1` or `/v2` version prefix is stripped) that
   * belong to this resource. A request matches when the path equals the prefix
   * or starts with `${prefix}/`.
   */
  readonly paths: readonly string[];
  /** Exact paths owned by this resource; child paths do not inherit it. */
  readonly exactPaths?: readonly string[];
  /**
   * Nested path templates (after the version prefix is stripped) that belong to
   * this resource, with `{param}` standing in for a single path segment — for
   * example `/projects/{projectId}/geo/prompts`. A request matches when the
   * path equals the expanded template or continues with `/`.
   *
   * Patterns are resolved BEFORE the flat `paths` prefixes, so a nested
   * resource wins over the parent resource that owns the same prefix.
   */
  readonly pathPatterns?: readonly string[];
  /** Exact templated paths; child paths do not inherit the match. */
  readonly exactPathPatterns?: readonly string[];
  /** Human label shown in the API-key scope picker. */
  readonly label: string;
  /** Human description shown in the API-key scope picker. */
  readonly description: string;
  /** Canonical OpenAPI tag for operations belonging to this resource. */
  readonly openApiTag: ApiOpenApiTagName;
  /**
   * Path segments that are still reachable through the pre-v2 layout
   * `/{organizationId}/{segment}`. Matched before the regular path prefixes.
   */
  readonly legacyOrganizationSegments?: readonly string[];
}

export const API_OPENAPI_TAGS = [
  {
    name: "Webhooks",
    description: "Manage outbound webhook subscriptions and delivery history.",
  },
  {
    name: "Discovery",
    description: "Public API status and service discovery.",
  },
  {
    name: "Content",
    description:
      "Manage posts, brand identities, and GitHub or Linear integrations, and queue content generation. Organization is inferred from the API key (identity.externalId).",
  },
  {
    name: "Schedules",
    description:
      "Manage scheduled content generation. Organization is inferred from the API key (identity.externalId).",
  },
  {
    name: "Event Triggers",
    description:
      "Manage event-based content generation triggered by GitHub webhooks. Organization is inferred from the API key (identity.externalId).",
  },
  {
    name: "Chats",
    description:
      "Manage chat sessions. Organization is inferred from the API key (identity.externalId).",
  },
  {
    name: "Skills",
    description:
      "Manage reusable writing skills. Organization is inferred from the API key (identity.externalId).",
  },
  {
    name: "Feedback",
    description:
      "Collect and triage feedback submitted by AI agents. Agents post to the organization's feedback URL without credentials; reading and triage require an API key with feedback.read or feedback.write.",
  },
  {
    name: "GEO",
    description:
      "Manage generative engine optimization: projects, tracking settings, prompts, prompt sequences, competitors, scans, visibility reads, content gaps and briefs, agent readiness and AI traffic. Project-scoped endpoints require the GEO plan entitlement in addition to their scope; organization-level ingest endpoints require only the traffic scope.",
  },
] as const;

export type ApiOpenApiTagName = (typeof API_OPENAPI_TAGS)[number]["name"];

export const API_SCOPE_RESOURCES = [
  {
    id: "webhooks",
    paths: ["/webhooks"],
    label: "Webhooks",
    description: "Outbound subscriptions and delivery history",
    openApiTag: "Webhooks",
  },
  {
    id: "posts",
    paths: ["/posts"],
    label: "Posts",
    description: "Read and manage your posts and drafts",
    openApiTag: "Content",
    legacyOrganizationSegments: ["posts"],
  },
  {
    id: "brand-identities",
    paths: ["/brand-identities"],
    label: "Brand identities",
    description: "Read and manage saved brand voices",
    openApiTag: "Content",
  },
  {
    id: "integrations",
    paths: ["/integrations"],
    label: "Integrations",
    description: "Read and manage connected content sources",
    openApiTag: "Content",
  },
  {
    id: "schedules",
    paths: ["/schedules"],
    label: "Schedules",
    description: "Read and manage scheduled content generation",
    openApiTag: "Schedules",
    legacyOrganizationSegments: ["schedules"],
  },
  {
    id: "event-triggers",
    paths: ["/event-triggers"],
    label: "Event triggers",
    description: "Read and manage event-based content generation",
    openApiTag: "Event Triggers",
    legacyOrganizationSegments: ["event-triggers"],
  },
  {
    id: "chats",
    paths: ["/chats", "/agent-chats", "/eve"],
    label: "Chats",
    description: "Read and manage chat sessions",
    openApiTag: "Chats",
  },
  {
    id: "skills",
    paths: ["/skills"],
    label: "Skills",
    description: "Read and manage your skills",
    openApiTag: "Skills",
  },
  {
    id: "feedback",
    paths: ["/feedback"],
    label: "Agent feedback",
    description: "Read and triage feedback submitted by AI agents",
    openApiTag: "Feedback",
  },
  {
    id: "projects",
    paths: [],
    exactPaths: ["/projects"],
    exactPathPatterns: ["/projects/{projectId}"],
    label: "Projects",
    description: "Read and manage GEO projects",
    openApiTag: "GEO",
  },
  {
    id: "geo-settings",
    paths: [],
    pathPatterns: ["/projects/{projectId}/geo/settings"],
    label: "GEO settings",
    description: "Read and manage a project's GEO tracking configuration",
    openApiTag: "GEO",
  },
  {
    id: "prompts",
    paths: [],
    pathPatterns: [
      "/projects/{projectId}/geo/prompts",
      "/projects/{projectId}/geo/sequences",
    ],
    label: "GEO prompts",
    description: "Read and manage tracked GEO prompts and prompt sequences",
    openApiTag: "GEO",
  },
  {
    id: "competitors",
    paths: [],
    pathPatterns: ["/projects/{projectId}/geo/competitors"],
    label: "GEO competitors",
    description: "Read and manage tracked GEO competitors",
    openApiTag: "GEO",
  },
  {
    id: "scans",
    paths: [],
    pathPatterns: ["/projects/{projectId}/geo/scans"],
    label: "GEO scans",
    description: "Read GEO scan history and trigger new scans",
    openApiTag: "GEO",
  },
  {
    id: "visibility",
    paths: [],
    pathPatterns: ["/projects/{projectId}/geo/visibility"],
    label: "GEO visibility",
    description: "Read GEO mention rates, trends and competitor share",
    openApiTag: "GEO",
  },
  {
    id: "briefs",
    paths: [],
    pathPatterns: [
      "/projects/{projectId}/geo/gaps",
      "/projects/{projectId}/geo/briefs",
    ],
    label: "GEO content briefs",
    description: "Read content gaps and plan, read and approve content briefs",
    openApiTag: "GEO",
  },
  {
    id: "agent-readiness",
    paths: [],
    pathPatterns: ["/projects/{projectId}/geo/agent-readiness"],
    label: "GEO agent readiness",
    description: "Read agent readiness reports and start new readiness scans",
    openApiTag: "GEO",
  },
  {
    id: "traffic",
    // `/geo/ingest/*` is organization-level: the ingest token identifies the
    // organization, not a project, so it cannot live under `/projects/{id}`.
    paths: ["/geo/ingest"],
    pathPatterns: ["/projects/{projectId}/geo/traffic"],
    label: "GEO AI traffic",
    description:
      "Read AI crawler and referral traffic, and manage the ingest token",
    openApiTag: "GEO",
  },
] as const satisfies readonly ApiScopeResourceDefinition[];

export type ApiScopeResource = (typeof API_SCOPE_RESOURCES)[number];
export type ApiScopeResourceId = ApiScopeResource["id"];

export type ApiReadScope = `${ApiScopeResourceId}.read`;
export type ApiWriteScope = `${ApiScopeResourceId}.write`;
export type ApiGranularScope = ApiReadScope | ApiWriteScope;

/** OAuth scope requesting a refresh token. Not tied to any resource. */
export const OFFLINE_ACCESS_SCOPE = "offline_access";

/** Pre-granular scopes. `api.write` implies every scope, `api.read` every read scope. */
export const LEGACY_API_READ_SCOPE = "api.read";
export const LEGACY_API_WRITE_SCOPE = "api.write";
export const LEGACY_API_SCOPES = [
  LEGACY_API_READ_SCOPE,
  LEGACY_API_WRITE_SCOPE,
] as const;

export type LegacyApiScope = (typeof LEGACY_API_SCOPES)[number];

export function getApiScopeId(
  resourceId: ApiScopeResourceId,
  access: ApiScopeAccess
): ApiGranularScope {
  return `${resourceId}.${access}`;
}

export const API_SCOPE_RESOURCE_IDS: readonly ApiScopeResourceId[] =
  API_SCOPE_RESOURCES.map((resource) => resource.id);

/** Read scopes in registry order. */
export const API_READ_SCOPES: readonly ApiReadScope[] = API_SCOPE_RESOURCES.map(
  (resource) => `${resource.id}.read` as const
);

/** Write scopes in registry order. */
export const API_WRITE_SCOPES: readonly ApiWriteScope[] =
  API_SCOPE_RESOURCES.map((resource) => `${resource.id}.write` as const);

/** Every granular scope: all read scopes first, then all write scopes. */
export const API_GRANULAR_SCOPES: readonly ApiGranularScope[] = [
  ...API_READ_SCOPES,
  ...API_WRITE_SCOPES,
];

/** Granular scopes plus the legacy coarse scopes. */
export const API_ACCEPTED_SCOPES: readonly (
  | ApiGranularScope
  | LegacyApiScope
)[] = [...API_GRANULAR_SCOPES, ...LEGACY_API_SCOPES];

/**
 * Scopes advertised through OAuth discovery metadata: `offline_access` first,
 * then read/write grouped per resource.
 */
export const PUBLIC_API_SCOPES: readonly string[] = [
  OFFLINE_ACCESS_SCOPE,
  ...API_SCOPE_RESOURCES.flatMap((resource) => [
    getApiScopeId(resource.id, "read"),
    getApiScopeId(resource.id, "write"),
  ]),
];

const GRANULAR_SCOPE_SET: ReadonlySet<string> = new Set(API_GRANULAR_SCOPES);
const LEGACY_SCOPE_SET: ReadonlySet<string> = new Set(LEGACY_API_SCOPES);
const SCOPE_ORDER: ReadonlyMap<string, number> = new Map(
  API_GRANULAR_SCOPES.map((scope, index) => [scope as string, index])
);

export function isApiGranularScope(scope: string): scope is ApiGranularScope {
  return GRANULAR_SCOPE_SET.has(scope);
}

export function isLegacyApiScope(scope: string): scope is LegacyApiScope {
  return LEGACY_SCOPE_SET.has(scope);
}

/** Scopes that are neither granular nor legacy — surfaced as "unknown" in the UI. */
export function getUnknownApiScopes(scopes: readonly string[]): string[] {
  return scopes.filter(
    (scope) => !(isApiGranularScope(scope) || isLegacyApiScope(scope))
  );
}

/** Filters out non-granular scopes and sorts the rest into registry order. */
export function sortApiScopes(scopes: readonly string[]): ApiGranularScope[] {
  return scopes
    .filter(isApiGranularScope)
    .sort((a, b) => (SCOPE_ORDER.get(a) ?? 0) - (SCOPE_ORDER.get(b) ?? 0));
}

/**
 * Expands `api.read` / `api.write` into the granular scopes they cover and
 * drops anything unrecognised. Result is sorted into registry order.
 */
export function expandLegacyApiScopes(
  scopes: readonly string[]
): ApiGranularScope[] {
  const next = new Set<string>();

  for (const scope of scopes) {
    if (isApiGranularScope(scope)) {
      next.add(scope);
      continue;
    }
    if (scope === LEGACY_API_WRITE_SCOPE) {
      for (const granular of API_GRANULAR_SCOPES) {
        next.add(granular);
      }
      continue;
    }
    if (scope === LEGACY_API_READ_SCOPE) {
      for (const granular of API_READ_SCOPES) {
        next.add(granular);
      }
    }
  }

  return sortApiScopes([...next]);
}

const MUTATION_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);
const VERSION_PREFIX_REGEX = /^\/v[12](?=\/|$)/;
const UNSCOPED_PATHS: ReadonlySet<string> = new Set(["/status"]);

function normalizeApiPath(pathname: string): string {
  return pathname.replace(VERSION_PREFIX_REGEX, "") || "/";
}

export function isUnscopedApiPath(pathname: string): boolean {
  return UNSCOPED_PATHS.has(normalizeApiPath(pathname));
}

// `as const satisfies` keeps each entry narrow, so resources that omit the
// optional field genuinely do not have it — narrow with `in` rather than `?.`.
function getLegacyOrganizationSegments(
  resource: ApiScopeResource
): readonly string[] {
  return "legacyOrganizationSegments" in resource
    ? resource.legacyOrganizationSegments
    : [];
}

const LEGACY_ORGANIZATION_MATCHERS: readonly {
  readonly resourceId: ApiScopeResourceId;
  readonly regex: RegExp;
}[] = API_SCOPE_RESOURCES.flatMap((resource) =>
  getLegacyOrganizationSegments(resource).map((segment) => ({
    resourceId: resource.id,
    regex: new RegExp(`^/[^/]+/${segment}(?:/|$)`),
  }))
);

function getPathPatterns(resource: ApiScopeResource): readonly string[] {
  return "pathPatterns" in resource ? resource.pathPatterns : [];
}

function getExactPaths(resource: ApiScopeResource): readonly string[] {
  return "exactPaths" in resource ? resource.exactPaths : [];
}

function getExactPathPatterns(resource: ApiScopeResource): readonly string[] {
  return "exactPathPatterns" in resource ? resource.exactPathPatterns : [];
}

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const PATH_PARAM_SEGMENT = /^\{[^/]+\}$/;

function compilePathPattern(pattern: string, exact = false): RegExp {
  const source = pattern
    .split("/")
    .map((segment) =>
      PATH_PARAM_SEGMENT.test(segment)
        ? "[^/]+"
        : segment.replace(REGEX_SPECIAL_CHARS, "\\$&")
    )
    .join("/");

  return new RegExp(exact ? `^${source}$` : `^${source}(?:/|$)`);
}

const EXACT_PATH_MATCHERS: readonly {
  readonly resourceId: ApiScopeResourceId;
  readonly path: string;
}[] = API_SCOPE_RESOURCES.flatMap((resource) =>
  getExactPaths(resource).map((path) => ({ resourceId: resource.id, path }))
);

const EXACT_PATH_PATTERN_MATCHERS: readonly {
  readonly resourceId: ApiScopeResourceId;
  readonly regex: RegExp;
}[] = API_SCOPE_RESOURCES.flatMap((resource) =>
  getExactPathPatterns(resource).map((pattern) => ({
    resourceId: resource.id,
    regex: compilePathPattern(pattern, true),
  }))
);

const PATH_PATTERN_MATCHERS: readonly {
  readonly resourceId: ApiScopeResourceId;
  readonly regex: RegExp;
}[] = API_SCOPE_RESOURCES.flatMap((resource) =>
  getPathPatterns(resource).map((pattern) => ({
    resourceId: resource.id,
    regex: compilePathPattern(pattern),
  }))
);

export function isApiMutationMethod(method: string): boolean {
  return MUTATION_METHODS.has(method);
}

function accessForMethod(method: string): ApiScopeAccess {
  return isApiMutationMethod(method) ? "write" : "read";
}

/**
 * Resolves the scope a request must carry. `undefined` means that the endpoint
 * is either explicitly public or absent from the registry; callers must use
 * `isUnscopedApiPath` to distinguish those cases and fail closed otherwise.
 */
export function getRequiredApiScope(
  pathname: string,
  method: string
): ApiGranularScope | undefined {
  const path = normalizeApiPath(pathname);

  if (UNSCOPED_PATHS.has(path)) {
    return undefined;
  }

  const legacyMatch = LEGACY_ORGANIZATION_MATCHERS.find((matcher) =>
    matcher.regex.test(path)
  );
  if (legacyMatch) {
    return getApiScopeId(legacyMatch.resourceId, accessForMethod(method));
  }

  // Nested resources first: `/projects/{id}/geo/prompts` belongs to `prompts`,
  // not to the `projects` resource that owns the `/projects` prefix.
  const patternMatch = PATH_PATTERN_MATCHERS.find((matcher) =>
    matcher.regex.test(path)
  );
  if (patternMatch) {
    return getApiScopeId(patternMatch.resourceId, accessForMethod(method));
  }

  const exactPatternMatch = EXACT_PATH_PATTERN_MATCHERS.find((matcher) =>
    matcher.regex.test(path)
  );
  if (exactPatternMatch) {
    return getApiScopeId(exactPatternMatch.resourceId, accessForMethod(method));
  }

  const exactMatch = EXACT_PATH_MATCHERS.find(
    (matcher) => matcher.path === path
  );
  if (exactMatch) {
    return getApiScopeId(exactMatch.resourceId, accessForMethod(method));
  }

  const resource = API_SCOPE_RESOURCES.find((item) =>
    item.paths.some(
      (resourcePath) =>
        path === resourcePath || path.startsWith(`${resourcePath}/`)
    )
  );
  if (!resource) {
    return undefined;
  }

  return getApiScopeId(resource.id, accessForMethod(method));
}
