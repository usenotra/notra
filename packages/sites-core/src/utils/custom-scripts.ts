import {
  SITE_CUSTOM_SCRIPT_FILENAME,
  SITE_CUSTOM_SCRIPTS_DIR,
  SITE_SOURCE_ROOTS,
} from "@notra/sites-core/constants/sites";

export function isCustomScriptPath(path: string): boolean {
  if (!/\.js$/i.test(path)) {
    return false;
  }
  const root = path.split("/")[0] ?? "";
  return (
    path === SITE_CUSTOM_SCRIPT_FILENAME ||
    root === SITE_CUSTOM_SCRIPTS_DIR ||
    !SITE_SOURCE_ROOTS.has(root)
  );
}

export function sortCustomScriptPaths(paths: Iterable<string>): string[] {
  return [...paths].filter(isCustomScriptPath).sort((a, b) => {
    if (a === SITE_CUSTOM_SCRIPT_FILENAME) {
      return -1;
    }
    if (b === SITE_CUSTOM_SCRIPT_FILENAME) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    return a > b ? 1 : 0;
  });
}
