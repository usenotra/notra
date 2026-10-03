"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import type {
  FileTree as FileTreeModel,
  FileTreeDirectoryHandle,
  GitStatusEntry,
} from "@pierre/trees";
import {
  FileTree,
  useFileTree,
  useFileTreeSearch,
  useFileTreeSelection,
} from "@pierre/trees/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

import {
  SITE_EDITOR_COLLAPSED_FOLDERS,
  SITE_FILE_TREE_CSS,
} from "@/constants/site-editor";
import type { SiteFileTreeFile, SiteFileTreeProps } from "@/types/site-editor";

const SKELETON_ROWS = [
  "w-1/2",
  "w-3/4",
  "w-2/3",
  "w-2/5",
  "w-3/5",
  "w-5/6",
  "w-1/3",
] as const;

function ancestorsOf(path: string): string[] {
  const parts = path.split("/");
  return parts
    .slice(0, -1)
    .map((_, index) => parts.slice(0, index + 1).join("/"));
}

function folderHandle(
  model: FileTreeModel,
  path: string
): FileTreeDirectoryHandle | null {
  const item = model.getItem(path);
  return item && "expand" in item ? item : null;
}

function isCollapsedByDefault(folder: string): boolean {
  return SITE_EDITOR_COLLAPSED_FOLDERS.some(
    (collapsed) => folder === collapsed || folder.startsWith(`${collapsed}/`)
  );
}

/** Folders open on first render: everything but asset folders, plus the open file's. */
function initialExpandedFolders(
  paths: readonly string[],
  selectedPath: string | null
): string[] {
  const folders = new Set<string>();
  for (const path of paths) {
    for (const folder of ancestorsOf(path)) {
      if (!isCollapsedByDefault(folder)) {
        folders.add(folder);
      }
    }
  }
  for (const folder of selectedPath ? ancestorsOf(selectedPath) : []) {
    folders.add(folder);
  }
  return [...folders];
}

function gitStatusOf(files: readonly SiteFileTreeFile[]): GitStatusEntry[] {
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

function SiteFileTreeView({
  files,
  selectedPath,
  onSelect,
}: Omit<SiteFileTreeProps, "isLoading">) {
  const t = useTranslations("sites.editorPage.tree");
  const paths = useMemo(() => files.map((file) => file.path), [files]);
  const editablePaths = useMemo(
    () => new Set(files.filter((file) => file.editable).map((f) => f.path)),
    [files]
  );
  const gitStatus = useMemo(() => gitStatusOf(files), [files]);
  const { model } = useFileTree({
    paths,
    initialExpansion: "closed",
    initialExpandedPaths: initialExpandedFolders(paths, selectedPath),
    initialSelectedPaths: selectedPath ? [selectedPath] : [],
    flattenEmptyDirectories: false,
    fileTreeSearchMode: "hide-non-matches",
    gitStatus,
    icons: { set: "standard", colored: false },
    density: "compact",
    itemHeight: 28,
    unsafeCSS: SITE_FILE_TREE_CSS,
  });
  const search = useFileTreeSearch(model);
  const selection = useFileTreeSelection(model);
  const pathsKey = paths.join("\n");
  const appliedPathsKey = useRef(pathsKey);

  // A new or removed draft file changes the list; keep the folders the user opened.
  useEffect(() => {
    if (appliedPathsKey.current === pathsKey) {
      return;
    }
    const previous = appliedPathsKey.current.split("\n");
    appliedPathsKey.current = pathsKey;
    const expanded = new Set<string>();
    for (const path of previous) {
      for (const folder of ancestorsOf(path)) {
        if (folderHandle(model, folder)?.isExpanded()) {
          expanded.add(folder);
        }
      }
    }
    model.resetPaths(pathsKey.split("\n"), {
      initialExpandedPaths: [...expanded],
    });
  }, [model, pathsKey]);

  useEffect(() => {
    model.setGitStatus(gitStatus);
  }, [model, gitStatus]);

  // Opening a file from elsewhere (a problem, a conflict, the URL) reveals it here.
  useEffect(() => {
    if (!selectedPath) {
      return;
    }
    const current = model.getSelectedPaths();
    if (current.length === 1 && current[0] === selectedPath) {
      return;
    }
    for (const path of current) {
      model.getItem(path)?.deselect();
    }
    for (const folder of ancestorsOf(selectedPath)) {
      folderHandle(model, folder)?.expand();
    }
    model.getItem(selectedPath)?.select();
    model.scrollToPath(selectedPath, { focus: false, offset: "nearest" });
  }, [model, selectedPath, pathsKey]);

  // Clicking or pressing Enter on a row selects it; editable files open. Only a new
  // pick counts: when the page opens a file, the stale pick must not reopen the old one.
  const picked = selection.at(-1) ?? null;
  const lastPicked = useRef(picked);
  useEffect(() => {
    if (picked === lastPicked.current) {
      return;
    }
    lastPicked.current = picked;
    if (picked && picked !== selectedPath && editablePaths.has(picked)) {
      onSelect(picked);
    }
  }, [picked, selectedPath, editablePaths, onSelect]);

  const query = search.value;
  const noMatches = query.length > 0 && search.matchingPaths.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pt-2 pb-1">
        <InputGroup className="bg-background h-8">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.5} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={t("filter")}
            autoCapitalize="none"
            autoComplete="off"
            className="text-[13px]"
            onChange={(event) => search.setValue(event.target.value || null)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                search.setValue(null);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                search.focusNextMatch();
              }
              // Enter opens the highlighted match, like a quick-open list.
              const focused = model.getFocusedPath();
              if (
                event.key === "Enter" &&
                focused &&
                editablePaths.has(focused)
              ) {
                event.preventDefault();
                onSelect(focused);
              }
            }}
            placeholder={t("filter")}
            spellCheck={false}
            value={query}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label={t("clearFilter")}
                onClick={() => search.setValue(null)}
                size="icon-xs"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>
      {noMatches ? (
        <p className="text-muted-foreground px-2 py-6 text-center text-[13px]">
          {t("noMatches")}
        </p>
      ) : null}
      <FileTree
        aria-label={t("label")}
        className="block min-h-0 flex-1 px-1 pb-1"
        hidden={noMatches}
        model={model}
      />
    </div>
  );
}

/** The site's files through Pierre's tree: search, keyboard navigation, draft dots. */
export function SiteFileTree({
  files,
  selectedPath,
  onSelect,
  isLoading,
}: SiteFileTreeProps) {
  const t = useTranslations("sites.editorPage.tree");
  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-2.5 px-3 pt-3">
        <Skeleton className="mb-4 h-8 w-full" />
        {SKELETON_ROWS.map((width) => (
          <Skeleton className={`h-3.5 ${width}`} key={width} />
        ))}
      </div>
    );
  }
  if (files.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-6 text-center text-[13px]">
        {t("noFiles")}
      </p>
    );
  }
  return (
    <SiteFileTreeView
      files={files}
      onSelect={onSelect}
      selectedPath={selectedPath}
    />
  );
}
