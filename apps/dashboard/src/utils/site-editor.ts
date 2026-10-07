import type { IconSvgElement } from "@hugeicons/react";
import { ORPCError } from "@orpc/client";
import type { FileDiffMetadata, ThemeTypes } from "@pierre/diffs";
import type {
  FileTree as FileTreeModel,
  FileTreeDirectoryHandle,
  GitStatusEntry,
} from "@pierre/trees";

import {
  SITE_EDITOR_COLLAPSED_FOLDERS,
  SITE_EDITOR_EDIT_STATE_PREFIX,
  SITE_EDITOR_FILE_ICONS,
  SITE_EDITOR_IMAGE_EXTENSIONS,
  SITE_EDITOR_LANGUAGES,
} from "@/constants/site-editor";
import { SITE_EDITABLE_FILE_PATTERN } from "@/constants/sites";
import type {
  SiteDiffLineCounts,
  SiteDraftChange,
  SiteEditorLanguage,
  SiteEditorSaveState,
  SiteFileEditor,
  SiteFileTreeFile,
} from "@/types/site-editor";
import type {
  SiteEditorDocument,
  SiteEditorDraft,
  SiteEditorFile,
  SiteMounts,
  SiteNewFileFolder,
  SiteRecord,
} from "@/types/sites";

const ENTRY_FILE = /^(blog|changelog)\/(.+)\.mdx?$/;

function isEditableSiteFile(path: string): boolean {
  return SITE_EDITABLE_FILE_PATTERN.test(path);
}

function fileNameFromPath(path: string): string {
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

export function isSiteEditorUnsaved(saveState: SiteEditorSaveState): boolean {
  return saveState.status !== "idle" && saveState.status !== "saved";
}

export function siteEditorHasDraft(
  document: SiteEditorDocument | null,
  saveState: SiteEditorSaveState
): boolean {
  return (
    (document?.hasDraft ?? false) ||
    saveState.status === "saved" ||
    saveState.status === "saving"
  );
}

export function siteEditStateKey(siteId: string, path: string): string {
  return `${SITE_EDITOR_EDIT_STATE_PREFIX}:${siteId}:${path}`;
}

export function diffLineCounts(fileDiff: FileDiffMetadata): SiteDiffLineCounts {
  let additions = 0;
  let deletions = 0;
  for (const hunk of fileDiff.hunks) {
    additions += hunk.additionLines;
    deletions += hunk.deletionLines;
  }
  return { additions, deletions };
}

export function siteCodeThemeType(
  resolvedTheme: string | undefined
): ThemeTypes {
  if (resolvedTheme === "light" || resolvedTheme === "dark") {
    return resolvedTheme;
  }
  return "system";
}

export function siteDraftChange(
  draft: SiteEditorDraft,
  sourcePaths: ReadonlySet<string>
): SiteDraftChange {
  if (draft.deleted) {
    return "deleted";
  }
  return sourcePaths.has(draft.path) ? "modified" : "added";
}

export function siteFileAncestors(path: string): string[] {
  const parts = path.split("/");
  return parts
    .slice(0, -1)
    .map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function siteFileTreeFolderHandle(
  model: FileTreeModel,
  path: string
): FileTreeDirectoryHandle | null {
  const item = model.getItem(path);
  return item && "expand" in item ? item : null;
}

export function focusSiteFileTreeRow(
  model: FileTreeModel,
  path: string
): boolean {
  const row = model
    .getFileTreeContainer()
    ?.shadowRoot?.querySelector<HTMLElement>(
      `button[data-item-path="${CSS.escape(path)}"]`
    );
  if (!row) {
    return false;
  }
  row.focus();
  return true;
}

function isSiteFolderCollapsedByDefault(folder: string): boolean {
  return SITE_EDITOR_COLLAPSED_FOLDERS.some(
    (collapsed) => folder === collapsed || folder.startsWith(`${collapsed}/`)
  );
}

export function siteFileTreeInitialExpandedFolders(
  paths: readonly string[],
  selectedPath: string | null
): string[] {
  const folders = new Set<string>();
  for (const path of paths) {
    for (const folder of siteFileAncestors(path)) {
      if (!isSiteFolderCollapsedByDefault(folder)) {
        folders.add(folder);
      }
    }
  }
  for (const folder of selectedPath ? siteFileAncestors(selectedPath) : []) {
    folders.add(folder);
  }
  return [...folders];
}

export function siteFileTreeGitStatus(
  files: readonly SiteFileTreeFile[]
): GitStatusEntry[] {
  const entries: GitStatusEntry[] = [];
  for (const file of files) {
    if (file.isNew) {
      entries.push({ path: file.path, status: "added" });
    } else if (file.hasDraft) {
      entries.push({ path: file.path, status: "modified" });
    }
  }
  return entries;
}

export function focusSiteEditorLine(
  editor: SiteFileEditor | null,
  surface: HTMLElement | null,
  line: number
) {
  editor?.focus({ lineNumber: line, preventScroll: true });
  surface
    ?.querySelector("diffs-container")
    ?.shadowRoot?.querySelector(`[data-line="${line}"]`)
    ?.scrollIntoView({ block: "center" });
}
