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
import { FileTree, useFileTree, useFileTreeSearch } from "@pierre/trees/react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useTranslations } from "use-intl";

import {
  SITE_FILE_TREE_CSS,
  SITE_FILE_TREE_SKELETON_ROWS,
} from "@/constants/site-editor";
import type { SiteFileTreeProps } from "@/types/components/site-editor";
import {
  focusSiteFileTreeRow,
  siteFileAncestors,
  siteFileTreeFolderHandle,
  siteFileTreeGitStatus,
  siteFileTreeInitialExpandedFolders,
} from "@/utils/site-editor";

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
  const gitStatus = useMemo(() => siteFileTreeGitStatus(files), [files]);
  const latest = useRef({ selectedPath, editablePaths, onSelect });
  useLayoutEffect(() => {
    latest.current = { selectedPath, editablePaths, onSelect };
  });
  const { model } = useFileTree({
    paths,
    onSelectionChange: (selectedPaths) => {
      const picked = selectedPaths.at(-1);
      const current = latest.current;
      if (
        picked &&
        picked !== current.selectedPath &&
        current.editablePaths.has(picked)
      ) {
        current.onSelect(picked);
      }
    },
    initialExpansion: "closed",
    initialExpandedPaths: siteFileTreeInitialExpandedFolders(
      paths,
      selectedPath
    ),
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
  const pathsKey = paths.join("\n");
  const appliedPathsKey = useRef(pathsKey);

  useEffect(() => {
    if (appliedPathsKey.current === pathsKey) {
      return;
    }
    const previous = appliedPathsKey.current.split("\n");
    appliedPathsKey.current = pathsKey;
    const expanded = new Set<string>();
    for (const path of previous) {
      for (const folder of siteFileAncestors(path)) {
        if (siteFileTreeFolderHandle(model, folder)?.isExpanded()) {
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
    for (const folder of siteFileAncestors(selectedPath)) {
      siteFileTreeFolderHandle(model, folder)?.expand();
    }
    model.getItem(selectedPath)?.select();
    model.scrollToPath(selectedPath, { focus: false, offset: "nearest" });
  }, [model, selectedPath, pathsKey]);

  const query = search.value;
  const noMatches = query.length > 0 && search.matchingPaths.length === 0;
  const filterRef = useRef<HTMLInputElement>(null);

  const handleFilterKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      search.setValue(null);
      return;
    }
    if (!query) {
      return;
    }
    const focused = model.getFocusedPath();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!(focused && search.matchingPaths.includes(focused))) {
        search.focusNextMatch();
      }
      const target = model.getFocusedPath();
      if (target) {
        focusSiteFileTreeRow(model, target);
      }
      return;
    }
    if (event.key === "Enter" && focused && editablePaths.has(focused)) {
      event.preventDefault();
      search.setValue(null);
      onSelect(focused);
    }
  };

  const handleTreeKeyDownCapture = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    if (
      event.key === "ArrowUp" &&
      query &&
      model.getFocusedPath() === search.matchingPaths[0]
    ) {
      event.preventDefault();
      event.stopPropagation();
      filterRef.current?.focus();
    }
  };

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
            onKeyDown={handleFilterKeyDown}
            placeholder={t("filter")}
            ref={filterRef}
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
        onKeyDownCapture={handleTreeKeyDownCapture}
      />
    </div>
  );
}

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
        {SITE_FILE_TREE_SKELETON_ROWS.map((width) => (
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
