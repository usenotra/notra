export const SITE_AREAS = ["blog", "changelog"] as const;

export const SITE_CONFIG_FILENAME = "notra.json";

/** Every built area keeps its own assets below its mount, so a customer proxy only has to forward the mount path. */
export const SITE_ASSETS_DIR = "_notra/assets";
export const SITE_INTERNAL_PATH_SEGMENT = "_notra";
export const SITE_PROBE_FILENAME = "probe.txt";
export const SITE_ROUTES_FILENAME = "routes.json";

export const SITE_PREVIEW_HOST_SEPARATOR = "--";
export const SITE_PREVIEW_KEY_MAX_LENGTH = 40;
export const SITE_SLUG_MIN_LENGTH = 3;
export const SITE_SLUG_MAX_LENGTH = 40;

export const SITE_PREVIEW_COOKIE = "__notra_preview";
export const SITE_PREVIEW_AUTH_PATH = "/_notra/auth";
export const SITE_PREVIEW_SESSION_SECONDS = 60 * 60 * 12;
export const SITE_PREVIEW_SHARE_LINK_SECONDS = 60 * 60 * 24 * 7;

export const SITE_BUILD_LIMITS = {
  /** Wall clock for the whole sandbox build, both areas included. */
  buildTimeoutSeconds: 10 * 60,
  maxOutputBytes: 500 * 1024 * 1024,
  maxOutputFiles: 20_000,
  maxSingleFileBytes: 25 * 1024 * 1024,
  /** Source upload into the sandbox, after filtering to the files a site can use. */
  maxSourceBytes: 200 * 1024 * 1024,
  maxSourceFiles: 10_000,
  maxBuildLogBytes: 512 * 1024,
  /** Sandboxes building at once, across all customers. */
  maxConcurrentBuilds: 20,
  /** Sandboxes building at once for one site; more wait instead of piling up. */
  maxConcurrentBuildsPerSite: 2,
  /** Deployments one organization may queue per 24 hours (pushes, previews, redeploys). */
  maxDeploymentsPerOrganizationPerDay: 300,
} as const;

export const SITE_SOURCE_ROOT_ENTRIES = [
  SITE_CONFIG_FILENAME,
  "blog",
  "changelog",
  "snippets",
  "public",
  // Custom CSS, loaded on every page after the theme (like Mintlify's style.css).
  "style.css",
  "styles",
] as const;

export const SITE_SOURCE_EXTENSIONS = [
  ".md",
  ".mdx",
  ".jsx",
  ".js",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".mp4",
  ".webm",
  ".pdf",
  ".txt",
  ".woff",
  ".woff2",
  ".css",
] as const;

/** Mintlify pre-injects these hooks into inline and snippet components. */
export const SITE_INJECTED_REACT_HOOKS = [
  "useState",
  "useEffect",
  "useRef",
  "useCallback",
  "useMemo",
  "useContext",
  "useReducer",
  "useId",
  "useLayoutEffect",
  "useTransition",
  "useDeferredValue",
] as const;

export const SITE_DEPLOYMENT_KINDS = ["production", "preview"] as const;

/**
 * Lifecycle of a build. Whether a deployment is *live* is not a status: the
 * serving state in R2 is the only authority for that (see `referencedDeploymentIds`).
 * `ready` = built and stored, so it can go live or be restored later;
 * `expired` = its files were cleaned up.
 */
export const SITE_DEPLOYMENT_STATUSES = [
  "queued",
  "building",
  "uploading",
  "ready",
  "superseded",
  "failed",
  "canceled",
  "expired",
] as const;

type SiteDeploymentStatus = (typeof SITE_DEPLOYMENT_STATUSES)[number];

/** Allowed previous statuses per target status; every status write goes through this table. */
export const SITE_DEPLOYMENT_TRANSITIONS: Record<
  SiteDeploymentStatus,
  readonly SiteDeploymentStatus[]
> = {
  queued: [],
  // A retried job (expired lease) re-enters the step it crashed in.
  building: ["queued", "building"],
  uploading: ["building", "uploading"],
  ready: ["uploading"],
  superseded: ["queued"],
  failed: ["queued", "building", "uploading"],
  canceled: ["queued", "building", "uploading"],
  expired: ["ready"],
};

export const SITE_DEPLOYMENT_IN_PROGRESS_STATUSES = [
  "queued",
  "building",
  "uploading",
] as const;

export const SITE_DEPLOYMENT_TRIGGERS = [
  "push",
  "pull_request",
  "manual",
  "redeploy",
  "config",
] as const;

export const SITE_PREVIEW_VISIBILITIES = ["public", "protected"] as const;
export const SITE_PUBLISH_MODES = ["pull_request", "direct"] as const;
export const SITE_STATUSES = ["active", "suspended"] as const;
export const SITE_DOMAIN_KINDS = ["subdomain", "proxy"] as const;
export const SITE_DOMAIN_STATUSES = [
  "pending",
  "verifying",
  "active",
  "failed",
] as const;

/** R2 key layout. Everything lives in a private bucket; only the sites worker reads it. */
export const SITE_R2_KEYS = {
  host: (hostname: string) => `hosts/${hostname}.json`,
  state: (siteId: string) => `sites/${siteId}/state.json`,
  deploymentPrefix: (siteId: string, deploymentId: string) =>
    `deployments/${siteId}/${deploymentId}/`,
  manifest: (siteId: string, deploymentId: string) =>
    `deployments/${siteId}/${deploymentId}/manifest.json`,
  file: (siteId: string, deploymentId: string, path: string) =>
    `deployments/${siteId}/${deploymentId}/files${path}`,
  buildLog: (siteId: string, deploymentId: string) =>
    `logs/${siteId}/${deploymentId}.log`,
} as const;
