import { SITE_SOURCE_ROOTS } from "@notra/sites-core/constants/sites";
import {
  SITE_SOURCE_ALLOWED_EXTENSIONS,
  SITE_SOURCE_SAFE_SEGMENT,
} from "@notra/sites-core/constants/source";
import { isCustomScriptPath } from "@notra/sites-core/utils/custom-scripts";

export function isSiteContentPath(path: string): boolean {
  return SITE_SOURCE_ROOTS.has(path.split("/")[0] ?? "");
}

export function isSiteStylesheet(path: string): boolean {
  return path.toLowerCase().endsWith(".css");
}

export function isSiteSourcePath(path: string): boolean {
  return (
    isSiteContentPath(path) ||
    isSiteStylesheet(path) ||
    isCustomScriptPath(path)
  );
}

/** Matches the collector's traversal and regular-file rules. */
export function isCollectedSiteSourcePath(path: string): boolean {
  const segments = path.split("/");
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment.startsWith(".") ||
        segment === "node_modules" ||
        !SITE_SOURCE_SAFE_SEGMENT.test(segment)
    )
  ) {
    return false;
  }
  const name = segments.at(-1) ?? "";
  const dot = name.lastIndexOf(".");
  return (
    dot >= 0 &&
    SITE_SOURCE_ALLOWED_EXTENSIONS.has(name.slice(dot).toLowerCase()) &&
    isSiteSourcePath(path)
  );
}
