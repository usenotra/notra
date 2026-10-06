import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { siteConfigSchema } from "@notra/sites-core/schemas/site-config";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { SiteConfig } from "@notra/sites-core/types/site-config";

import type { SiteEntry } from "../types/entries";

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        current + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

export function unknownConfigKeyWarnings(raw: unknown): SiteDiagnostic[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }
  const known = Object.keys(siteConfigSchema.shape);
  return Object.keys(raw)
    .filter((key) => !known.includes(key))
    .map((key) => {
      const suggestion = known
        .map((candidate) => ({
          candidate,
          score: distance(key.toLowerCase(), candidate.toLowerCase()),
        }))
        .sort((a, b) => a.score - b.score)[0];
      const hint =
        suggestion && suggestion.score <= 2
          ? ` Did you mean "${suggestion.candidate}"?`
          : "";
      return {
        severity: "warning" as const,
        file: SITE_CONFIG_FILENAME,
        code: "config_unknown_key",
        message: `Unknown setting "${key}" is ignored.${hint}`,
      };
    });
}

export function featuredSlugWarnings(
  config: SiteConfig,
  entries: SiteEntry[]
): SiteDiagnostic[] {
  const featured = config.blog?.featured;
  if (!Array.isArray(featured)) {
    return [];
  }
  const slugs = new Set(
    entries.filter((entry) => entry.area === "blog").map((entry) => entry.slug)
  );
  return featured
    .filter((slug) => !slugs.has(slug))
    .map((slug) => ({
      severity: "warning" as const,
      file: SITE_CONFIG_FILENAME,
      code: "featured_unknown",
      message: `blog.featured: no post at blog/${slug}. It is skipped.`,
    }));
}
