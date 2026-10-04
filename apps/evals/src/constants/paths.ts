import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);
export const REPO_ROOT = resolve(APP_DIR, "../..");
/** Saved runs. Gitignored. */
export const RUNS_DIR = join(APP_DIR, ".runs");
export const CACHE_DIR = join(APP_DIR, ".cache");
