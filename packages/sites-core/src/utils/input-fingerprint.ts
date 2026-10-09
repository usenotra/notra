import { SITE_BUILD_LIMITS } from "../constants/sites";
import type { SiteInputFingerprintParams } from "../types/smart-deployments";
import { sha256Hex } from "./hash";
import { isCollectedSiteSourcePath } from "./source-files";
import { stableStringify } from "./stable-stringify";

/** Git blob IDs cover exact bytes, including binary assets. Unknown trees fail open. */
export async function fingerprintSiteInputs(
  params: SiteInputFingerprintParams
): Promise<string | null> {
  const { tree, truncated, rootDirectory } = params;
  // Archive attributes and LFS may transform Git blobs before compilation.
  // Until those transformations are verified, these repositories always build.
  if (
    tree.some((entry) =>
      [".gitattributes", ".lfsconfig"].includes(
        entry.path?.split("/").at(-1) ?? ""
      )
    )
  ) {
    return null;
  }
  if (
    truncated !== false ||
    (rootDirectory &&
      !tree.some(
        (entry) => entry.path === rootDirectory && entry.type === "tree"
      ))
  ) {
    return null;
  }
  const prefix = rootDirectory ? `${rootDirectory}/` : "";
  const files: [string, string][] = [];
  const seen = new Set<string>();
  let bytes = 0;
  for (const entry of tree) {
    if (!entry.path || !entry.sha || !entry.type) {
      return null;
    }
    if (!entry.path.startsWith(prefix)) {
      continue;
    }
    const path = entry.path.slice(prefix.length);
    if (!isCollectedSiteSourcePath(path)) {
      continue;
    }
    if (entry.type === "tree") {
      continue;
    }
    if (
      entry.type !== "blob" ||
      !["100644", "100755"].includes(entry.mode ?? "") ||
      !entry.sha ||
      entry.size === undefined ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      seen.has(path)
    ) {
      return null;
    }
    if (entry.size > SITE_BUILD_LIMITS.maxSingleFileBytes) {
      return null;
    }
    bytes += entry.size;
    if (
      bytes > SITE_BUILD_LIMITS.maxSourceBytes ||
      files.length >= SITE_BUILD_LIMITS.maxSourceFiles
    ) {
      return null;
    }
    seen.add(path);
    files.push([path, entry.sha]);
  }
  files.sort(([a], [b]) => a.localeCompare(b));
  return sha256Hex(
    new TextEncoder().encode(
      stableStringify({
        version: 1,
        files,
        rootDirectory,
        repositoryId: params.repositoryId,
        target: params.target,
        includeDrafts: params.includeDrafts,
        snapshotId: params.snapshotId,
        year: params.year,
      })
    )
  );
}
