import { lstat, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

import type {
  SiteDiagnostic,
  SiteSourceFile,
} from "@notra/sites-compiler/types/diagnostics";
import {
  SITE_BUILD_LIMITS,
  SITE_SOURCE_EXTENSIONS,
  SITE_SOURCE_ROOT_ENTRIES,
} from "@notra/sites-core/constants/sites";

const ALLOWED_EXTENSIONS = new Set<string>(SITE_SOURCE_EXTENSIONS);
const SAFE_SEGMENT = /^[A-Za-z0-9._@()+ -]+$/;

export interface CollectedSource {
  files: SiteSourceFile[];
  totalBytes: number;
  diagnostics: SiteDiagnostic[];
}

/**
 * Lists the files a site may use. Only the known top-level entries are read;
 * symlinks, dotfiles and unknown extensions are skipped so nothing outside the
 * site (or an `.env` someone committed) ever reaches the build.
 */
export async function collectSiteSource(
  siteRoot: string
): Promise<CollectedSource> {
  const files: SiteSourceFile[] = [];
  const diagnostics: SiteDiagnostic[] = [];
  let totalBytes = 0;

  async function walk(relativeDir: string): Promise<void> {
    const entries = await readdir(join(siteRoot, relativeDir), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
      if (!SAFE_SEGMENT.test(entry.name)) {
        diagnostics.push({
          severity: "warning",
          file: relativePath,
          code: "unsafe_filename",
          message:
            "Skipped: file names may only use letters, digits, spaces and ._-@()+",
        });
        continue;
      }
      const stats = await lstat(join(siteRoot, relativePath));
      if (stats.isSymbolicLink()) {
        diagnostics.push({
          severity: "warning",
          file: relativePath,
          code: "symlink_skipped",
          message: "Skipped: symbolic links are not followed",
        });
        continue;
      }
      if (stats.isDirectory()) {
        await walk(relativePath);
        continue;
      }
      if (!stats.isFile()) {
        continue;
      }
      if (!ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        continue;
      }
      if (stats.size > SITE_BUILD_LIMITS.maxSingleFileBytes) {
        diagnostics.push({
          severity: "error",
          file: relativePath,
          code: "file_too_large",
          message: `File is larger than ${SITE_BUILD_LIMITS.maxSingleFileBytes / 1024 / 1024} MB`,
        });
        continue;
      }
      totalBytes += stats.size;
      files.push({ path: relativePath, size: stats.size });
    }
  }

  for (const rootEntry of SITE_SOURCE_ROOT_ENTRIES) {
    const stats = await lstat(join(siteRoot, rootEntry)).catch(() => null);
    if (!stats || stats.isSymbolicLink()) {
      continue;
    }
    if (stats.isDirectory()) {
      await walk(rootEntry);
    } else if (stats.isFile()) {
      totalBytes += stats.size;
      files.push({ path: rootEntry, size: stats.size });
    }
  }

  if (files.length > SITE_BUILD_LIMITS.maxSourceFiles) {
    diagnostics.push({
      severity: "error",
      file: null,
      code: "too_many_files",
      message: `The site has ${files.length} files; the limit is ${SITE_BUILD_LIMITS.maxSourceFiles}`,
    });
  }
  if (totalBytes > SITE_BUILD_LIMITS.maxSourceBytes) {
    diagnostics.push({
      severity: "error",
      file: null,
      code: "source_too_large",
      message: `The site source is ${Math.round(totalBytes / 1024 / 1024)} MB; the limit is ${SITE_BUILD_LIMITS.maxSourceBytes / 1024 / 1024} MB`,
    });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, totalBytes, diagnostics };
}
