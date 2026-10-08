import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";

import type { RepositoryTreeScan } from "../types/github";

export const GITHUB_API_VERSION_HEADER = {
  "X-GitHub-Api-Version": "2022-11-28",
} as const;
export const MAX_TARBALL_BYTES = SITE_BUILD_LIMITS.maxSourceBytes;
export const CHECK_RUN_NAME = "Notra Sites";

export const BRANCH_SUGGESTION_LIMIT = 300;
export const GITHUB_PAGE_SIZE = 100;
export const CONTENT_FILE = /^(?:(.*)\/)?(blog|changelog)\/.+\.mdx?$/;

export const CONFIG_SEARCH_SKIPPED_SEGMENTS: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "vendor",
]);

export const EMPTY_TREE_SCAN: RepositoryTreeScan = {
  directories: [],
  contentCounts: {},
  truncated: false,
};
export const GITHUB_ARCHIVE_TIMEOUT_MS = 60_000;
