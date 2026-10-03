import {
  DashboardSquare01Icon,
  FileEditIcon,
  GitPullRequestIcon,
  Globe02Icon,
  RefreshIcon,
  Rocket01Icon,
  Settings01Icon,
  Upload04Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import type {
  SiteDeploymentStatus,
  SiteDeploymentTrigger,
  SiteDomainChipStatus,
  SiteSectionConfig,
} from "@/types/sites";

export const SITES_NAV_LINK = "/sites";

/** Polling while a build is queued or running, so status changes show up quickly. */
export const SITE_ACTIVE_POLL_INTERVAL_MS = 2000;
export const SITE_IDLE_POLL_INTERVAL_MS = 15_000;

export const SITE_DEPLOYMENT_IN_PROGRESS_STATUSES: ReadonlySet<SiteDeploymentStatus> =
  new Set(["queued", "building", "uploading"]);

export const SITE_DEPLOYMENT_FINISHED_STATUSES: ReadonlySet<SiteDeploymentStatus> =
  new Set(["ready", "superseded", "failed", "canceled", "expired"]);

export const SITE_DETAIL_TABS = [
  "overview",
  "deployments",
  "previews",
  "domains",
  "editor",
  "settings",
] as const;

/** A site's pages, in sidebar order; each is its own route below /sites/[siteId]. */
export const SITE_SECTIONS: readonly SiteSectionConfig[] = [
  { section: "overview", path: "", icon: DashboardSquare01Icon },
  { section: "deployments", path: "/deployments", icon: Rocket01Icon },
  { section: "previews", path: "/previews", icon: ViewIcon },
  { section: "domains", path: "/domains", icon: Globe02Icon },
  { section: "editor", path: "/editor", icon: FileEditIcon },
  { section: "settings", path: "/settings", icon: Settings01Icon },
];

export const SITE_RECENT_DEPLOYMENTS_LIMIT = 5;
export const SITE_OVERVIEW_PREVIEWS_LIMIT = 5;
/** Content-sized site tables: this only sizes the empty state, which holds an icon, copy and a button. */
export const SITE_TABLE_EMPTY_HEIGHT = 340;
export const SITE_TABLE_COMPACT_EMPTY_HEIGHT = 300;
export const SITE_DEPLOYMENTS_TABLE_ROW_HEIGHT = 56;
export const SITE_DEPLOYMENTS_TABLE_VISIBLE_ROWS = 12;
export const SITE_LIST_TABLE_ROW_HEIGHT = 60;
/** Property lists (deployment details) use the compact house row. */
export const SITE_PROPERTY_ROW_HEIGHT = 36;
export const SITE_SHORT_SHA_LENGTH = 7;
export const SITE_SHARE_LINK_DAYS = 7;

export const SITE_DEFAULT_BLOG_PATH = "/blog";
export const SITE_DEFAULT_CHANGELOG_PATH = "/changelog";

/** Autosave delay after the last keystroke in the editor. */
export const SITE_EDITOR_AUTOSAVE_MS = 1200;
export const SITE_CONFIG_FILENAME = "notra.json";
export const SITE_NEW_FILE_FOLDERS = ["blog", "changelog"] as const;
export const SITE_NEW_FILE_EXTENSION = ".mdx";
export const SITE_NEW_FILE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Only text sources are editable in the dashboard; images and fonts stay in the repo. */
export const SITE_EDITABLE_FILE_PATTERN = /\.(?:mdx?|jsx?|json|css)$/i;

export const SITE_REPOSITORY_LAYOUT = [
  { path: "notra.json", key: "config" },
  { path: "blog/*.mdx", key: "blog" },
  { path: "changelog/*.mdx", key: "changelog" },
  { path: "snippets/*.jsx", key: "snippets" },
  { path: "public/", key: "public" },
] as const;

export const SITE_PROXY_RECIPES = [
  "vercel",
  "next",
  "netlify",
  "tanstack",
  "cloudflare",
  "nginx",
] as const;

/** Domain Connect discovery hits DNS and the provider; the answer rarely changes while the page is open. */
export const SITE_DOMAIN_CONNECT_STALE_MS = 10 * 60 * 1000;
/** Query parameter the Domain Connect callback appends when it sends the browser back. */
export const SITE_DOMAIN_CONNECT_PARAM = "domainConnect";
export const SITE_DOMAIN_CONNECT_OUTCOMES = [
  "success",
  "cancelled",
  "error",
] as const;
/** How long a copy button shows "Copied". */
export const SITE_COPY_FEEDBACK_MS = 1500;

/** Status dot per domain state; `pending` reads differently for DNS and proxy domains. */
export const SITE_DOMAIN_STATUS_DOTS: Record<SiteDomainChipStatus, string> = {
  active: "bg-success",
  dnsRequired: "bg-warning",
  proxyRequired: "bg-warning",
  verifying: "bg-warning motion-safe:animate-pulse",
  failed: "bg-destructive",
};

/** What started a deployment, as the icon next to who started it. */
export const SITE_TRIGGER_ICONS: Record<SiteDeploymentTrigger, IconSvgElement> =
  {
    push: Upload04Icon,
    pull_request: GitPullRequestIcon,
    manual: Rocket01Icon,
    redeploy: RefreshIcon,
    config: Settings01Icon,
  };

/** One status language everywhere: building amber, ready green, failed red, the rest grey. */
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

/** Enough history for the deployments page; the API caps the list at 100. */
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

/** Ticks the elapsed time of a running build. */
export const SITE_ELAPSED_TICK_MS = 1000;

/** Distance from the bottom (px) within which the build log keeps following new output. */
export const SITE_BUILD_LOG_FOLLOW_THRESHOLD = 32;
