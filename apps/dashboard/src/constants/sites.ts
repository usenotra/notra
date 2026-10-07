import {
  Analytics01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  PlugSocketIcon,
  GitPullRequestIcon,
  Globe02Icon,
  Rocket01Icon,
  RefreshIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import type {
  SiteDeploymentFilters,
  SiteDeploymentKind,
  SiteDeploymentStatus,
  SiteDeploymentTrigger,
  SiteDomainChipStatus,
  SiteSectionConfig,
} from "@/types/sites";

export const SITES_NAV_LINK = "/sites";
export const SITES_FLAG_KEY = "sites";
export const SITES_FLAG_TIMEOUT_MS = 3000;

export const SITE_ACTIVE_POLL_INTERVAL_MS = 2000;
export const SITE_IDLE_POLL_INTERVAL_MS = 15_000;
export const SITE_ANALYTICS_POLL_INTERVAL_MS = 60_000;
export const SITE_OVERVIEW_ANALYTICS_DAYS = 7;

export const SITE_DEPLOYMENT_IN_PROGRESS_STATUSES: ReadonlySet<SiteDeploymentStatus> =
  new Set(["queued", "building", "uploading"]);

export const SITE_DETAIL_TABS = [
  "overview",
  "analytics",
  "deployments",
  "domains",
  "editor",
  "integrations",
  "settings",
] as const;

export const SITE_SECTIONS: readonly SiteSectionConfig[] = [
  { section: "overview", path: "", icon: DashboardSquare01Icon },
  { section: "analytics", path: "/analytics", icon: Analytics01Icon },
  { section: "deployments", path: "/deployments", icon: Rocket01Icon },
  { section: "domains", path: "/domains", icon: Globe02Icon },
  { section: "editor", path: "/editor", icon: FileEditIcon },
  { section: "integrations", path: "/integrations", icon: PlugSocketIcon },
  { section: "settings", path: "/settings", icon: Settings01Icon },
];

export const SITE_RECENT_DEPLOYMENTS_LIMIT = 5;
export const SITE_DEPLOYMENTS_PAGE_SIZE = 20;
export const SITE_OVERVIEW_PREVIEWS_LIMIT = 5;
export const SITE_TABLE_EMPTY_HEIGHT = 340;
export const SITE_TABLE_COMPACT_EMPTY_HEIGHT = 300;
export const SITE_LIST_TABLE_ROW_HEIGHT = 60;
export const SITE_SHORT_SHA_LENGTH = 7;
export const SITE_SHARE_LINK_DAYS = 7;

export const SITE_DEFAULT_BLOG_PATH = "/blog";
export const SITE_DEFAULT_CHANGELOG_PATH = "/changelog";

export const SITE_EDITOR_AUTOSAVE_MS = 1200;
export const SITE_CONFIG_FILENAME = "blog.json";
export const SITE_NEW_FILE_FOLDERS = ["blog", "changelog"] as const;
export const SITE_NEW_FILE_EXTENSION = ".mdx";
export const SITE_NEW_FILE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const SITE_EDITABLE_FILE_PATTERN = /\.(?:mdx?|jsx?|json|css)$/i;

export const SITE_PROXY_RECIPES = [
  "vercel",
  "next",
  "netlify",
  "tanstack",
  "cloudflare",
  "nginx",
] as const;

export const SITE_DOMAIN_CONNECT_STALE_MS = 10 * 60 * 1000;
export const SITE_DOMAIN_CONNECT_PARAM = "domainConnect";
export const SITE_DOMAIN_CONNECT_OUTCOMES = [
  "success",
  "cancelled",
  "error",
] as const;

export const SITE_DOMAIN_STATUS_DOTS: Record<SiteDomainChipStatus, string> = {
  active: "bg-success",
  dnsRequired: "bg-warning",
  proxyRequired: "bg-warning",
  verifying: "bg-warning motion-safe:animate-pulse",
  failed: "bg-destructive",
};

export const SITE_MANUAL_TRIGGER_ICONS: Partial<
  Record<SiteDeploymentTrigger, IconSvgElement>
> = {
  manual: RefreshIcon,
  redeploy: RefreshIcon,
  config: Settings01Icon,
};

export const SITE_STATUS_DOT_STYLES: Record<SiteDeploymentStatus, string> = {
  queued: "bg-muted-foreground/50",
  building: "bg-warning motion-safe:animate-pulse",
  uploading: "bg-warning motion-safe:animate-pulse",
  ready: "bg-success",
  failed: "bg-destructive",
  superseded: "bg-muted-foreground/40",
  canceled: "bg-muted-foreground/40",
  expired: "bg-muted-foreground/40",
};

export const SITE_DEPLOYMENT_ROW_HEIGHT = 48;

export const SITE_ENVIRONMENT_ICONS: Record<
  SiteDeploymentKind,
  IconSvgElement
> = {
  production: Rocket01Icon,
  preview: GitPullRequestIcon,
};

export const SITE_REPOSITORY_SUGGESTIONS_STALE_MS = 60_000;

export const SITE_DEPLOYMENTS_PAGE_LIMIT = 100;

export const SITE_DEPLOYMENT_ENVIRONMENT_FILTERS = [
  "all",
  "production",
  "preview",
] as const;

export const SITE_DEPLOYMENT_STATUS_FILTERS = [
  "all",
  "ready",
  "building",
  "queued",
  "failed",
  "canceled",
  "superseded",
  "expired",
] as const;

export const SITE_BUILD_LOG_FOLLOW_THRESHOLD = 32;

export const SITE_ADMIN_ROLES: ReadonlySet<string> = new Set([
  "owner",
  "admin",
]);

export const SITES_ONLY_GITHUB_EVENTS: ReadonlySet<string> = new Set([
  "push",
  "check_run",
]);

export const SITE_PREVIEW_KEY_PATTERN = /^(?:pr|br)-[a-z0-9-]{1,40}$/;

export const SITES_PAGE_SKELETON_ROWS = 3;

export const SITE_PREVIEW_VIEWPORT_WIDTH = 1280;
export const SITE_PREVIEW_VIEWPORT_HEIGHT = 800;

export const SITE_OVERVIEW_LINK_CLASS =
  "text-foreground decoration-foreground/25 hover:decoration-foreground min-w-0 truncate underline underline-offset-4 transition-colors duration-150";

export const SITE_BUILD_LOG_ROW_GRID =
  "grid grid-cols-[2rem_0.875rem_minmax(0,1fr)] gap-x-2 px-2 sm:grid-cols-[2.5rem_0.875rem_minmax(0,1fr)] sm:gap-x-2.5 sm:px-3";

export const SITE_BUILD_LOG_FRAME_FOLD_MIN = 3;
export const SITE_BUILD_LOG_NOISE_FOLD_MIN = 6;
export const SITE_BUILD_LOG_NOISE_KEEP = 2;

export const SITE_DEPLOYMENT_NO_FILTERS: SiteDeploymentFilters = {
  environment: "all",
  status: "all",
};

export const SITE_DOMAIN_URL_SCHEME_PATTERN = /^https?:\/\//i;

export const SITE_CLOUDFLARE_PROVIDER_PATTERN = /cloudflare/i;
export const SITE_VERCEL_PROVIDER_PATTERN = /vercel/i;

export const SITES_CLEANUP_CONCURRENCY = 4;

export const SITE_DEPLOYMENT_SHELL_CLASS =
  "border-shell-border bg-shell rounded-2xl border p-0.5";
export const SITE_DEPLOYMENT_SUMMARY_SURFACE_CLASS =
  "bg-background shadow-lift grid gap-6 rounded-[14px] border p-5 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]";
export const SITE_DEPLOYMENT_LOG_SURFACE_CLASS =
  "bg-background shadow-lift h-96 overflow-hidden rounded-[14px] border";
