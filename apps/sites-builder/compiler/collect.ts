import { lstat, opendir } from "node:fs/promises";
import { extname, join } from "node:path";

import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import {
  isSiteContentPath,
  isSiteSourcePath,
} from "@notra/sites-core/utils/source-files";

import { ALLOWED_EXTENSIONS, SAFE_SEGMENT } from "./constants/source";
import type {
  CollectedSource,
  Inspected,
  SiteSourceFile,
} from "./types/source";

export async function collectSiteSource(
  siteRoot: string
): Promise<CollectedSource> {
  const files: SiteSourceFile[] = [];
  const diagnostics: SiteDiagnostic[] = [];
  let totalBytes = 0;

  async function inspect(relativePath: string): Promise<Inspected> {
    const name = relativePath.slice(relativePath.lastIndexOf("/") + 1);
    if (name.startsWith(".") || name === "node_modules") {
      return { kind: "skip" };
    }
    const content = isSiteContentPath(relativePath);
    if (!(content || SAFE_SEGMENT.test(name))) {
      return { kind: "skip" };
    }
    if (!SAFE_SEGMENT.test(name)) {
      return {
        kind: "diagnostic",
        diagnostic: {
          severity: "warning",
          file: relativePath,
          code: "unsafe_filename",
          message:
            "Skipped: file names may only use letters, digits, spaces and ._-@()+",
        },
      };
    }
    const stats = await lstat(join(siteRoot, relativePath));
    if (stats.isSymbolicLink()) {
      return {
        kind: "diagnostic",
        diagnostic: {
          severity: "warning",
          file: relativePath,
          code: "symlink_skipped",
          message: "Skipped: symbolic links are not followed",
        },
      };
    }
    if (stats.isDirectory()) {
      return { kind: "directory", path: relativePath };
    }
    if (
      !stats.isFile() ||
      !ALLOWED_EXTENSIONS.has(extname(name).toLowerCase()) ||
      !isSiteSourcePath(relativePath)
    ) {
      return { kind: "skip" };
    }
    if (stats.size > SITE_BUILD_LIMITS.maxSingleFileBytes) {
      return {
        kind: "diagnostic",
        diagnostic: {
          severity: "error",
          file: relativePath,
          code: "file_too_large",
          message: `File is larger than ${SITE_BUILD_LIMITS.maxSingleFileBytes / 1024 / 1024} MB`,
        },
      };
    }
    return { kind: "file", file: { path: relativePath, size: stats.size } };
  }

  const directories = [""];
  let stopped = false;
  while (directories.length > 0 && !stopped) {
    const relativeDir = directories.pop() ?? "";
    const directory = await opendir(join(siteRoot, relativeDir));
    for await (const entry of directory) {
      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;
      const result = await inspect(relativePath);
      if (result.kind === "diagnostic") {
        diagnostics.push(result.diagnostic);
        if (result.diagnostic.severity === "error") {
          stopped = true;
          break;
        }
      } else if (result.kind === "directory") {
        directories.push(result.path);
      } else if (result.kind === "file") {
        if (files.length >= SITE_BUILD_LIMITS.maxSourceFiles) {
          diagnostics.push({
            severity: "error",
            file: null,
            code: "too_many_files",
            message: `The site has more than ${SITE_BUILD_LIMITS.maxSourceFiles} files; the limit is ${SITE_BUILD_LIMITS.maxSourceFiles}`,
          });
          stopped = true;
          break;
        }
        if (result.file.size > SITE_BUILD_LIMITS.maxSourceBytes - totalBytes) {
          diagnostics.push({
            severity: "error",
            file: null,
            code: "source_too_large",
            message: `The site source is larger than ${SITE_BUILD_LIMITS.maxSourceBytes / 1024 / 1024} MB; the limit is ${SITE_BUILD_LIMITS.maxSourceBytes / 1024 / 1024} MB`,
          });
          stopped = true;
          break;
        }
        totalBytes += result.file.size;
        files.push(result.file);
      }
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, totalBytes, diagnostics };
}
