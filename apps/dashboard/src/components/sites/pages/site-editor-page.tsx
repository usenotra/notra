"use client";

import {
  CheckmarkCircle02Icon,
  FileEditIcon,
  PlusSignIcon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { Editor } from "@pierre/diffs/edit";
import type { EditorFactory } from "@pierre/diffs/edit";
import { EditProvider } from "@pierre/diffs/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { PageHeader } from "@/components/layout/page-header";
import { SiteEditorConflictBanner } from "@/components/sites/editor/site-editor-conflict-banner";
import { SiteEditorPane } from "@/components/sites/editor/site-editor-pane";
import { SiteEditorProblems } from "@/components/sites/editor/site-editor-problems";
import { SiteEditorStatusBar } from "@/components/sites/editor/site-editor-status-bar";
import { SiteFileTree } from "@/components/sites/editor/site-file-tree";
import { useSite } from "@/components/sites/site-context";
import { SiteNewFileDialog } from "@/components/sites/site-new-file-dialog";
import { SitePublishDialog } from "@/components/sites/site-publish-dialog";
import { SITE_NEW_FILE_FOLDERS } from "@/constants/sites";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteEditorJump, SiteEditorSaveState } from "@/types/site-editor";
import type { SiteDiagnostic } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { listSiteEditorFiles, siteEditorLanguage } from "@/utils/site-editor";

const createSiteEditor: EditorFactory<unknown, undefined> = (
  editorType,
  options,
  editStateKey
) => new Editor(editorType, options, editStateKey);

export function SiteEditorPage() {
  const { organizationId, siteId, detail } = useSite();
  const t = useTranslations("sites.editorPage");
  const tEditor = useTranslations("sites.editor");
  const queryClient = useQueryClient();
  const invalidateSites = useInvalidateSites();
  const { site } = detail;
  const filesOptions = dashboardOrpc.sites.editor.files.queryOptions({
    input: { organizationId, siteId },
    refetchOnWindowFocus: false,
  });
  const filesQuery = useQuery(filesOptions);
  const [selectedParam, setSelectedParam] = useQueryState(
    "file",
    parseAsString.withOptions({ history: "replace" })
  );
  const [saveState, setSaveState] = useState<SiteEditorSaveState>({
    status: "idle",
  });
  const [jump, setJump] = useState<SiteEditorJump | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<SiteDiagnostic[] | null>(null);
  const [problemsOpen, setProblemsOpen] = useState(false);
  // Bumped after publishing or rebasing so the open file reloads.
  const [editorEpoch, setEditorEpoch] = useState(0);

  const data = filesQuery.data ?? null;
  const drafts = data?.drafts ?? [];
  const treeFiles = useMemo(
    () => listSiteEditorFiles(data?.files ?? [], data?.drafts ?? []),
    [data]
  );
  const editablePaths = new Set(
    treeFiles.filter((file) => file.editable).map((file) => file.path)
  );
  const selectedPath =
    selectedParam && editablePaths.has(selectedParam) ? selectedParam : null;
  const selectedDraft = selectedPath
    ? drafts.find((draft) => draft.path === selectedPath)
    : undefined;
  const draftCount = data ? drafts.length : detail.draftCount;
  const mountedFolders = SITE_NEW_FILE_FOLDERS.filter((folder) =>
    Boolean(site.mounts[folder])
  );
  const unsaved = saveState.status === "dirty" || saveState.status === "saving";

  // Not all of `sites`: open files must not refetch (and hit GitHub) on every autosave.
  const refreshDrafts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: filesOptions.queryKey }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.sites.get.key(),
      }),
    ]);
  };

  // Autosaves update the file list in place; refetching it would ask GitHub on every save.
  const applyDraftChange = (path: string, updatedAt: Date | null) => {
    queryClient.setQueryData(filesOptions.queryKey, (current) => {
      if (!current) {
        return current;
      }
      const others = current.drafts.filter((draft) => draft.path !== path);
      if (updatedAt === null) {
        return { ...current, drafts: others };
      }
      const existing = current.drafts.find((draft) => draft.path === path);
      const source = current.files.find((file) => file.path === path);
      return {
        ...current,
        drafts: [
          ...others,
          {
            path,
            deleted: false,
            baseBlobSha: existing?.baseBlobSha ?? source?.sha ?? null,
            updatedAt,
          },
        ],
      };
    });
    void queryClient.invalidateQueries({
      queryKey: dashboardOrpc.sites.get.key(),
    });
  };

  const openFile = useCallback(
    (path: string) => {
      setJump(null);
      setSaveState({ status: "idle" });
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

  const rebaseMutation = useMutation({
    mutationFn: async (paths: string[]) => {
      for (const path of paths) {
        await dashboardOrpc.sites.editor.rebaseDraft.call({
          organizationId,
          siteId,
          path,
        });
      }
    },
    onSuccess: async () => {
      setConflicts([]);
      setEditorEpoch((epoch) => epoch + 1);
      await refreshDrafts();
      toast.success(tEditor("conflict.rebased"));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tEditor("conflict.rebaseFailed")));
    },
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.editor.validate.call({ organizationId, siteId }),
    onSuccess: (result) => {
      setDiagnostics(result.diagnostics);
      setProblemsOpen(true);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tEditor("validateFailed")));
    },
  });

  const createMutation = useMutation({
    mutationFn: (file: { path: string; content: string }) =>
      dashboardOrpc.sites.editor.saveDraft.call({
        organizationId,
        siteId,
        path: file.path,
        content: file.content,
        baseBlobSha: null,
        baseCommitSha: data?.commitSha ?? null,
      }),
    onSuccess: async (result) => {
      setNewFileOpen(false);
      await refreshDrafts();
      openFile(result.path);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tEditor("createFailed")));
    },
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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground max-w-sm text-sm text-pretty">
          {toErrorMessage(filesQuery.error, tEditor("filesFailed"))}
        </p>
        <Button
          onClick={() => {
            void filesQuery.refetch();
          }}
          size="sm"
          variant="outline"
        >
          {t("retry")}
        </Button>
      </div>
    );
  } else if (selectedPath) {
    editorSurface = (
      <SiteEditorPane
        baseCommitSha={data?.commitSha ?? null}
        diagnostics={fileDiagnostics}
        draftUpdatedAt={
          selectedDraft ? new Date(selectedDraft.updatedAt) : null
        }
        hasConflict={conflicts.includes(selectedPath)}
        jump={jump?.path === selectedPath ? jump : null}
        key={`${selectedPath}:${editorEpoch}`}
        onDraftChange={applyDraftChange}
        onOpenFilePicker={() => setPickerOpen(true)}
        onSaveStateChange={setSaveState}
        organizationId={organizationId}
        path={selectedPath}
        site={site}
        siteId={siteId}
      />
    );
  } else {
    editorSurface = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
          <HugeiconsIcon
            aria-hidden="true"
            icon={FileEditIcon}
            size={18}
            strokeWidth={1.5}
          />
        </div>
        <div className="max-w-xs space-y-1">
          <h2 className="text-sm font-medium">{t("empty.title")}</h2>
          <p className="text-muted-foreground text-sm text-pretty">
            {t("empty.description")}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            className="md:hidden"
            disabled={filesQuery.isPending}
            onClick={() => setPickerOpen(true)}
            size="sm"
            variant="outline"
          >
            {t("empty.chooseFile")}
          </Button>
          <Button
            disabled={!data || mountedFolders.length === 0}
            onClick={() => setNewFileOpen(true)}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.5} />
            {t("newFile")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EditProvider createEditor={createSiteEditor}>
      <PageHeader description={t("description")} title={t("title")}>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={!data || mountedFolders.length === 0}
            onClick={() => setNewFileOpen(true)}
            variant="outline"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={1.5} />
            {t("newFile")}
          </Button>
          <Button
            disabled={!data || unsaved}
            loading={validateMutation.isPending}
            onClick={() => validateMutation.mutate()}
            variant="outline"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={15}
              strokeWidth={1.5}
            />
            {t("validate")}
          </Button>
          <Button
            aria-label={t("publishLabel", { count: draftCount })}
            disabled={draftCount === 0 || unsaved}
            onClick={() => setPublishOpen(true)}
          >
            <HugeiconsIcon icon={Rocket01Icon} size={15} strokeWidth={1.5} />
            {t("publish")}
            {draftCount > 0 ? (
              <span className="bg-primary-foreground/20 -me-0.5 rounded-full px-1.5 text-xs tabular-nums">
                {draftCount}
              </span>
            ) : null}
          </Button>
        </div>
      </PageHeader>

      {conflicts.length > 0 ? (
        <SiteEditorConflictBanner
          isRebasing={rebaseMutation.isPending}
          onDismiss={() => setConflicts([])}
          onRebase={() => rebaseMutation.mutate(conflicts)}
          onSelect={(path) => {
            if (editablePaths.has(path)) {
              openFile(path);
            }
          }}
          paths={conflicts}
        />
      ) : null}

      <div className="border-shell-border bg-shell flex h-[calc(100dvh-15.5rem)] min-h-[28rem] flex-col rounded-2xl border p-0.5">
        <div className="flex min-h-0 flex-1 gap-0.5">
          <aside className="hidden w-60 shrink-0 flex-col md:flex lg:w-64">
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

      <Sheet onOpenChange={setPickerOpen} open={pickerOpen}>
        <SheetContent
          className="gap-0 p-0"
          // On touch, focusing the filter would pop the keyboard over the tree.
          initialFocus={(openType) => openType !== "touch"}
          side="left"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm">{t("tree.title")}</SheetTitle>
          </SheetHeader>
          <div className="bg-shell flex min-h-0 flex-1 flex-col">
            {fileTree}
          </div>
        </SheetContent>
      </Sheet>

      <SitePublishDialog
        draftCount={draftCount}
        drafts={drafts}
        onConflict={setConflicts}
        onOpenChange={setPublishOpen}
        onPublished={() => {
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
        sourcePaths={new Set((data?.files ?? []).map((file) => file.path))}
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
