import type { IconSvgElement } from "@hugeicons/react";
import { ORPCError } from "@orpc/client";
import type { FileDiffMetadata, ThemeTypes } from "@pierre/diffs";

import {
  SITE_EDITOR_EDIT_STATE_PREFIX,
  SITE_EDITOR_FILE_ICONS,
  SITE_EDITOR_IMAGE_EXTENSIONS,
  SITE_EDITOR_LANGUAGES,
} from "@/constants/site-editor";
import { SITE_EDITABLE_FILE_PATTERN } from "@/constants/sites";
import type { SiteEditorLanguage, SiteFileTreeFile } from "@/types/site-editor";
import type {
  SiteEditorDraft,
  SiteEditorFile,
  SiteMounts,
  SiteNewFileFolder,
  SiteRecord,
} from "@/types/sites";

const ENTRY_FILE = /^(blog|changelog)\/(.+)\.mdx?$/;

export function isEditableSiteFile(path: string): boolean {
  return SITE_EDITABLE_FILE_PATTERN.test(path);
}

export function fileNameFromPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function fileExtension(path: string): string {
  const name = fileNameFromPath(path);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function siteEditorLanguage(path: string): SiteEditorLanguage {
  return SITE_EDITOR_LANGUAGES[fileExtension(path)] ?? "text";
}

export function siteFileIcon(path: string): IconSvgElement {
  if (SITE_EDITOR_IMAGE_EXTENSIONS.includes(fileExtension(path))) {
    return SITE_EDITOR_FILE_ICONS.image;
  }
  return SITE_EDITOR_FILE_ICONS[siteEditorLanguage(path)];
}

/**
 * Every file the tree lists: the repository's site files plus files that only exist as
 * drafts. Deleted drafts drop out; other drafts mark their file.
 */
export function listSiteEditorFiles(
  files: readonly SiteEditorFile[],
  drafts: readonly SiteEditorDraft[]
): SiteFileTreeFile[] {
  const draftByPath = new Map(drafts.map((draft) => [draft.path, draft]));
  const sourcePaths = new Set(files.map((file) => file.path));
  const entries = [
    ...files.map((file) => ({ path: file.path, isNew: false })),
    ...drafts
      .filter((draft) => !(draft.deleted || sourcePaths.has(draft.path)))
      .map((draft) => ({ path: draft.path, isNew: true })),
  ];
  const result: SiteFileTreeFile[] = [];
  for (const entry of entries) {
    const draft = draftByPath.get(entry.path);
    if (draft?.deleted) {
      continue;
    }
    result.push({
      path: entry.path,
      editable: isEditableSiteFile(entry.path),
      isNew: entry.isNew,
      hasDraft: Boolean(draft),
    });
  }
  return result;
}

/** Where a blog or changelog entry is served on the live site; null for other files. */
export function siteFileLiveUrl(
  path: string,
  publicOrigin: string,
  mounts: SiteMounts
): string | null {
  const match = ENTRY_FILE.exec(path);
  const area = match?.[1];
  const rest = match?.[2];
  if (!(area && rest) || rest.split("/").some((part) => part.startsWith("_"))) {
    return null;
  }
  const mount = area === "blog" ? mounts.blog : mounts.changelog;
  if (!mount) {
    return null;
  }
  const slug = rest === "index" ? "" : rest.replace(/\/index$/, "");
  const base = mount === "/" ? "" : mount;
  return `${publicOrigin}${base}${slug ? `/${slug}` : ""}`;
}

export function siteFileGithubUrl(
  site: SiteRecord,
  path: string
): string | null {
  if (!site.repository) {
    return null;
  }
  const fullPath = site.rootDirectory ? `${site.rootDirectory}/${path}` : path;
  return `https://github.com/${site.repository.owner}/${site.repository.name}/blob/${encodeURIComponent(site.productionBranch)}/${fullPath}`;
}

/** `My first post!` → `my-first-post`. */
export function slugifyFileName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.mdx?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function siteNewFileTemplate(
  folder: SiteNewFileFolder,
  title: string,
  date: Date
): string {
  const day = date.toISOString().slice(0, 10);
  const safeTitle = JSON.stringify(title.trim() || "Untitled");
  if (folder === "changelog") {
    return `---\ntitle: ${safeTitle}\ndate: ${day}\nversion: ""\n---\n\nWhat changed and why it matters.\n`;
  }
  return `---\ntitle: ${safeTitle}\ndescription: ""\ndate: ${day}\n---\n\nStart writing here.\n`;
}

/** Paths a publish conflict reported, or null when the error is not a conflict. */
export function publishConflictPaths(error: unknown): string[] | null {
  if (!(error instanceof ORPCError) || error.code !== "CONFLICT") {
    return null;
  }
  const data: unknown = error.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "paths" in data &&
    Array.isArray(data.paths)
  ) {
    return data.paths.filter(
      (path): path is string => typeof path === "string"
    );
  }
  return [];
}

/** Key for Pierre's in-memory undo history of one site file. */
export function siteEditStateKey(siteId: string, path: string): string {
  return `${SITE_EDITOR_EDIT_STATE_PREFIX}:${siteId}:${path}`;
}

/** Lines added and removed across a diff's hunks. */
export function diffLineCounts(fileDiff: FileDiffMetadata): {
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;
  for (const hunk of fileDiff.hunks) {
    additions += hunk.additionLines;
    deletions += hunk.deletionLines;
  }
  return { additions, deletions };
}

/** Pierre follows the dashboard theme; before next-themes resolves it follows the OS. */
export function siteCodeThemeType(
  resolvedTheme: string | undefined
): ThemeTypes {
  if (resolvedTheme === "light" || resolvedTheme === "dark") {
    return resolvedTheme;
  }
  return "system";
}
