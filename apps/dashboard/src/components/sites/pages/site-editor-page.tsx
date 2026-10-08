"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { EditProvider } from "@pierre/diffs/react";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "use-intl";

import { SiteEditorConflictBanner } from "@/components/sites/editor/site-editor-conflict-banner";
import { SiteEditorEmptyState } from "@/components/sites/editor/site-editor-empty-state";
import { SiteEditorFilePicker } from "@/components/sites/editor/site-editor-file-picker";
import { SiteEditorFilesError } from "@/components/sites/editor/site-editor-files-error";
import { SiteEditorHeaderActions } from "@/components/sites/editor/site-editor-header-actions";
import { SiteEditorPane } from "@/components/sites/editor/site-editor-pane";
import { SiteEditorProblems } from "@/components/sites/editor/site-editor-problems";
import { SiteEditorStatusBar } from "@/components/sites/editor/site-editor-status-bar";
import { SiteFileTree } from "@/components/sites/editor/site-file-tree";
import { useSite } from "@/components/sites/site-context";
import { SiteNewFileDialog } from "@/components/sites/site-new-file-dialog";
import { SitePublishDialog } from "@/components/sites/site-publish-dialog";
import { SITE_NEW_FILE_FOLDERS } from "@/constants/sites";
import {
  useCreateSiteFile,
  useRebaseSiteDrafts,
  useSiteEditorFiles,
  useValidateSiteDrafts,
} from "@/lib/hooks/use-site-editor-files";
import { useSiteEditorSaves } from "@/lib/hooks/use-site-editor-saves";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { useWarnBeforeUnload } from "@/lib/hooks/use-warn-before-unload";
import type { SiteEditorJump } from "@/types/site-editor";
import type { SiteDiagnostic } from "@/types/sites";
import { siteEditorLanguage } from "@/utils/site-editor";
import { createSiteEditor } from "@/utils/site-editor-factory";

export function SiteEditorPage() {
  const { organizationId, siteId, detail } = useSite();
  const t = useTranslations("sites.editorPage");
  const invalidateSites = useInvalidateSites();
  const { site } = detail;
  const {
    filesQuery,
    data,
    drafts,
    treeFiles,
    editablePaths,
    sourcePaths,
    baseCommitSha,
    refreshDrafts,
    applyDraftChange,
  } = useSiteEditorFiles({ organizationId, siteId });
  const [selectedParam, setSelectedParam] = useQueryState(
    "file",
    parseAsString.withOptions({ history: "replace" })
  );
  const saves = useSiteEditorSaves(
    { organizationId, siteId },
    applyDraftChange
  );
  useWarnBeforeUnload(saves.unsaved);
  const [jump, setJump] = useState<SiteEditorJump | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<SiteDiagnostic[] | null>(null);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [editorEpoch, setEditorEpoch] = useState(0);

  const selectedPath =
    selectedParam && editablePaths.has(selectedParam) ? selectedParam : null;
  const draftCount = data ? drafts.length : detail.draftCount;
  const mountedFolders = SITE_NEW_FILE_FOLDERS.filter((folder) =>
    Boolean(site.mounts[folder])
  );
  const canCreateFile = data !== null && mountedFolders.length > 0;
  const unsaved = saves.unsaved;

  const openFile = useCallback(
    (path: string) => {
      setJump(null);
      setPickerOpen(false);
      void setSelectedParam(path);
    },
    [setSelectedParam]
  );
  const fileDiagnostics = useMemo(
    () =>
      diagnostics?.filter((diagnostic) => diagnostic.file === selectedPath) ??
      [],
    [diagnostics, selectedPath]
  );

  const rebaseMutation = useRebaseSiteDrafts({
    organizationId,
    siteId,
    onSettled: (paths) => {
      const replaced = saves.resetClean(paths);
      if (selectedPath && replaced.includes(selectedPath)) {
        setEditorEpoch((epoch) => epoch + 1);
      }
    },
    onRebased: () => {
      setConflicts([]);
    },
  });
  const validateMutation = useValidateSiteDrafts({
    organizationId,
    siteId,
    onValidated: (next) => {
      setDiagnostics(next);
      setProblemsOpen(true);
    },
  });
  const createMutation = useCreateSiteFile({
    organizationId,
    siteId,
    baseCommitSha,
    sourceContext: data?.sourceContext ?? {
      productionBranch: site.productionBranch,
      rootDirectory: site.rootDirectory,
    },
    refreshDrafts,
    onSaved: () => setNewFileOpen(false),
    onCreated: openFile,
  });

  const selectDiagnostic = (diagnostic: SiteDiagnostic) => {
    const file = diagnostic.file;
    if (!(file && editablePaths.has(file))) {
      return;
    }
    if (file !== selectedPath) {
      openFile(file);
    }
    if (diagnostic.line !== undefined) {
      setJump({
        path: file,
        line: diagnostic.line,
        nonce: (jump?.nonce ?? 0) + 1,
      });
    }
  };

  const fileTree = (
    <SiteFileTree
      files={treeFiles}
      isLoading={filesQuery.isPending}
      onSelect={openFile}
      selectedPath={selectedPath}
    />
  );

  let editorSurface: React.ReactNode;
  if (filesQuery.isError) {
    editorSurface = (
      <SiteEditorFilesError
        error={filesQuery.error}
        onRetry={() => {
          void filesQuery.refetch();
        }}
      />
    );
  } else if (selectedPath) {
    editorSurface = (
      <SiteEditorPane
        baseCommitSha={baseCommitSha}
        diagnostics={fileDiagnostics}
        jump={jump?.path === selectedPath ? jump : null}
        key={`${organizationId}:${siteId}:${selectedPath}:${editorEpoch}`}
        onOpenFilePicker={() => setPickerOpen(true)}
        saveQueue={saves.getQueue(selectedPath)}
        organizationId={organizationId}
        path={selectedPath}
        site={site}
        siteId={siteId}
      />
    );
  } else {
    editorSurface = (
      <SiteEditorEmptyState
        canCreateFile={canCreateFile}
        filesLoading={filesQuery.isPending}
        onChooseFile={() => setPickerOpen(true)}
        onNewFile={() => setNewFileOpen(true)}
      />
    );
  }

  return (
    <EditProvider createEditor={createSiteEditor}>
      <PageHeading description={t("description")} title={t("title")}>
        <div inert={rebaseMutation.isPending}>
          <SiteEditorHeaderActions
            canCreateFile={canCreateFile}
            draftCount={draftCount}
            onNewFile={() => setNewFileOpen(true)}
            onPublish={() => setPublishOpen(true)}
            unsaved={unsaved}
          />
        </div>
      </PageHeading>

      {conflicts.length > 0 ? (
        <SiteEditorConflictBanner
          canRebase={!unsaved && !rebaseMutation.isPending}
          isRebasing={rebaseMutation.isPending}
          onDismiss={() => setConflicts([])}
          onRebase={() => {
            if (!unsaved && !rebaseMutation.isPending) {
              rebaseMutation.mutate(conflicts);
            }
          }}
          onSelect={(path) => {
            if (editablePaths.has(path)) {
              openFile(path);
            }
          }}
          paths={conflicts}
        />
      ) : null}

      <div
        className="border-shell-border bg-shell flex min-h-[28rem] flex-1 basis-0 flex-col rounded-2xl border p-0.5"
        data-site-editor=""
        inert={rebaseMutation.isPending}
      >
        <div className="flex min-h-0 flex-1 gap-0.5">
          <aside className="hidden w-60 shrink-0 flex-col md:flex lg:w-72">
            {fileTree}
          </aside>
          <div className="bg-background shadow-lift flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border">
            {editorSurface}
            {problemsOpen && diagnostics ? (
              <SiteEditorProblems
                diagnostics={diagnostics}
                onClose={() => setProblemsOpen(false)}
                onSelect={selectDiagnostic}
              />
            ) : null}
          </div>
        </div>
        <SiteEditorStatusBar
          diagnostics={diagnostics}
          isValidating={validateMutation.isPending}
          language={selectedPath ? siteEditorLanguage(selectedPath) : null}
          onToggleProblems={() => {
            if (diagnostics) {
              setProblemsOpen((open) => !open);
            } else if (data && !unsaved) {
              validateMutation.mutate();
            }
          }}
          problemsOpen={problemsOpen}
        />
      </div>

      <SiteEditorFilePicker onOpenChange={setPickerOpen} open={pickerOpen}>
        <div inert={rebaseMutation.isPending}>{fileTree}</div>
      </SiteEditorFilePicker>

      <SitePublishDialog
        draftCount={draftCount}
        drafts={drafts}
        onConflict={setConflicts}
        onOpenChange={setPublishOpen}
        onPublished={() => {
          saves.reset();
          setConflicts([]);
          setDiagnostics(null);
          setProblemsOpen(false);
          setEditorEpoch((epoch) => epoch + 1);
          void invalidateSites();
        }}
        open={publishOpen}
        organizationId={organizationId}
        site={site}
        siteId={siteId}
        sourcePaths={sourcePaths}
        unsaved={unsaved}
      />
      <SiteNewFileDialog
        existingPaths={editablePaths}
        folders={mountedFolders}
        isCreating={createMutation.isPending}
        onCreate={(path, content) => createMutation.mutate({ path, content })}
        onOpenChange={setNewFileOpen}
        open={newFileOpen}
      />
    </EditProvider>
  );
}
