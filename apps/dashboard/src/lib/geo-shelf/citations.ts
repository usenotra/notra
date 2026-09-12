import { GEO_SHELF_TITLE_MAX_LENGTH } from "@notra/schemas/constants/dashboard/geo-shelf";
import {
  shelfDomainFromUrl,
  tryCanonicalizeShelfUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";

import { GEO_SHELF_EMPTY_CITATIONS } from "@/constants/geo-shelf";

import type {
  GeoShelfCitationRawRow,
  GeoShelfCitationSummary,
  GeoShelfCitedPage,
} from "../../types/geo-shelf";

function toIso(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString();
}

function clipTitle(title: string | null | undefined): string | null {
  const trimmed = title?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, GEO_SHELF_TITLE_MAX_LENGTH);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  );
}

export function emptyShelfCitations(): GeoShelfCitationSummary {
  return { ...GEO_SHELF_EMPTY_CITATIONS, engines: [] };
}

function minIso(left: string, right: string): string {
  return left <= right ? left : right;
}

function maxIso(left: string, right: string): string {
  return left >= right ? left : right;
}

export function citationsEqual(
  left: GeoShelfCitationSummary,
  right: GeoShelfCitationSummary
): boolean {
  const leftEngines = uniqueSorted(left.engines);
  const rightEngines = uniqueSorted(right.engines);
  return (
    left.windowCount === right.windowCount &&
    left.totalCount === right.totalCount &&
    left.promptCount === right.promptCount &&
    left.firstCitedAt === right.firstCitedAt &&
    left.lastCitedAt === right.lastCitedAt &&
    leftEngines.length === rightEngines.length &&
    leftEngines.every((engine, index) => engine === rightEngines[index])
  );
}

/**
 * Collapse raw mention-check URL groups onto canonical shelf URLs so
 * `www` / `old.reddit.com` / tracking-param variants count as one page.
 */
type FoldedCitationPage = GeoShelfCitedPage & {
  promptIds: Set<string>;
  checkIds: Set<string>;
  windowCheckIds: Set<string>;
};

export function foldShelfCitationRows(
  rows: readonly GeoShelfCitationRawRow[]
): GeoShelfCitedPage[] {
  const byUrl = new Map<string, FoldedCitationPage>();

  for (const row of rows) {
    const url = tryCanonicalizeShelfUrl(row.url);
    if (!url) {
      continue;
    }
    const firstCitedAt = toIso(row.firstCitedAt);
    const lastCitedAt = toIso(row.lastCitedAt);
    const title = clipTitle(row.title);
    const existing = byUrl.get(url);
    if (!existing) {
      byUrl.set(url, {
        url,
        domain: shelfDomainFromUrl(url),
        title,
        citations: {
          windowCount: row.windowCount,
          totalCount: row.totalCount,
          promptCount: 0,
          engines: uniqueSorted(row.engines),
          firstCitedAt,
          lastCitedAt,
        },
        promptIds: new Set(row.promptIds),
        checkIds: new Set(row.checkIds),
        windowCheckIds: new Set(row.windowCheckIds),
      });
      continue;
    }
    for (const checkId of row.checkIds) {
      existing.checkIds.add(checkId);
    }
    existing.citations.totalCount = existing.checkIds.size;
    for (const checkId of row.windowCheckIds) {
      existing.windowCheckIds.add(checkId);
    }
    existing.citations.windowCount = existing.windowCheckIds.size;
    existing.citations.engines = uniqueSorted([
      ...existing.citations.engines,
      ...row.engines,
    ]);
    existing.citations.firstCitedAt = minIso(
      existing.citations.firstCitedAt ?? firstCitedAt,
      firstCitedAt
    );
    if (lastCitedAt >= (existing.citations.lastCitedAt ?? lastCitedAt)) {
      existing.citations.lastCitedAt = lastCitedAt;
      if (title) {
        existing.title = title;
      }
    } else {
      existing.citations.lastCitedAt = maxIso(
        existing.citations.lastCitedAt ?? lastCitedAt,
        lastCitedAt
      );
      if (!existing.title && title) {
        existing.title = title;
      }
    }
    for (const promptId of row.promptIds) {
      existing.promptIds.add(promptId);
    }
  }

  return [...byUrl.values()].map((page) => {
    const {
      promptIds,
      checkIds: _checkIds,
      windowCheckIds: _windowCheckIds,
      ...cited
    } = page;
    cited.citations.promptCount = promptIds.size;
    cited.citations.engines = uniqueSorted(cited.citations.engines);
    return cited;
  });
}
