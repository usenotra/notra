import type {
  ContentDataPointSettings,
  OnDemandContentType,
} from "@notra/schemas/dashboard/content";

import type { EventType } from "@/types/content/preview";

export const GITHUB_API_PAGE_SIZE = 100;
export const GITHUB_API_MAX_PAGES = 50;
export const GITHUB_API_MAX_RESULTS = 500;

export const DEFAULT_CONTENT_TYPE: OnDemandContentType = "changelog";

export const DASHBOARD_HOME_POST_LIMIT = 3;

export const DEFAULT_DATA_POINTS: ContentDataPointSettings = {
  includePullRequests: true,
  includeCommits: true,
  includeReleases: true,
  includeLinearData: false,
};

export const EVENT_BADGE: Record<EventType, string> = {
  Release: "bg-green-600 text-white border-transparent",
  PR: "bg-blue-600 text-white border-transparent",
  Commit: "bg-orange-600 text-white border-transparent",
  LinearIssue: "bg-indigo-600 text-white border-transparent",
};
