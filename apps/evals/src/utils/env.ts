import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { REPO_ROOT } from "../constants/paths";

const LINE_REGEX = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/;

/** Loads the monorepo root .env without overriding variables that are already set. */
export function loadRepoEnv(): string | undefined {
  const file = join(REPO_ROOT, ".env");
  if (!existsSync(file)) {
    return undefined;
  }
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(LINE_REGEX);
    if (!match?.[1] || line.trimStart().startsWith("#")) {
      continue;
    }
    let value = (match[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] ??= value;
  }
  return file;
}
