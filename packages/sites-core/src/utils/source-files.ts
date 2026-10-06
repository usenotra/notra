import { SITE_SOURCE_ROOTS } from "@notra/sites-core/constants/sites";
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
