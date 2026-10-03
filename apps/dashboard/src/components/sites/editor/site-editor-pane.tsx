"use client";

import { GitCompareIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { SiteCodeEditor } from "@/components/sites/editor/site-code-editor";
import { SiteEditorFileBar } from "@/components/sites/editor/site-editor-file-bar";
import { SiteFileDiff } from "@/components/sites/editor/site-file-diff";
import { SITE_EDITOR_AUTOSAVE_MS } from "@/constants/sites";
import { useSiteCodeHighlighter } from "@/lib/hooks/use-site-code-highlighter";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SiteDiffStyle,
  SiteEditorMode,
  SiteEditorPaneProps,
  SiteEditorSaveState,
} from "@/types/site-editor";
import { toErrorMessage } from "@/utils/error-message";
import { siteEditStateKey } from "@/utils/site-editor";

const LOADING_LINES = ["w-1/3", "w-2/3", "w-1/2", "w-3/5", "w-1/4"] as const;

/** One open file: loads it, autosaves edits as a draft, compares it with what's live. */
export function SiteEditorPane({
  organizationId,
  siteId,
  site,
  path,
  baseCommitSha,
  draftUpdatedAt,
  hasConflict,
  diagnostics,
  jump,
  onDraftChange,
  onSaveStateChange,
  onOpenFilePicker,
}: SiteEditorPaneProps) {
  const t = useTranslations("sites.editor");
  const tPage = useTranslations("sites.editorPage");
  const queryClient = useQueryClient();
  const readOptions = dashboardOrpc.sites.editor.read.queryOptions({
    input: { organizationId, siteId, path },
    refetchOnWindowFocus: false,
  });
  const readQuery = useQuery(readOptions);
  const highlighterReady = useSiteCodeHighlighter();
  const document = readQuery.data ?? null;
  const [content, setContent] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SiteEditorSaveState>({
    status: "idle",
  });
  const [mode, setMode] = useState<SiteEditorMode>("edit");
  const [diffStyle, setDiffStyle] = useState<SiteDiffStyle>("unified");
  // Remounts the editor with fresh text (and a fresh undo history) after a discard.
  const [revision, setRevision] = useState(0);
  // Jumping to a problem's line always lands in the editor.
  const [seenJump, setSeenJump] = useState(jump);
  if (jump !== seenJump) {
    setSeenJump(jump);
    if (jump) {
      setMode("edit");
    }
  }
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const value = content ?? document?.content ?? "";

  const updateSaveState = (next: SiteEditorSaveState) => {
    setSaveState(next);
    onSaveStateChange(next);
  };

  const saveInput = (text: string) => ({
    organizationId,
    siteId,
    path,
    content: text,
    baseBlobSha: document?.blobSha ?? null,
    baseCommitSha,
  });

  // The publish dialog diffs drafts from this cache; keep it on what was saved.
  const rememberSaved = (text: string) => {
    queryClient.setQueryData(readOptions.queryKey, (current) =>
      current ? { ...current, content: text, hasDraft: true } : current
    );
  };

  const saveMutation = useMutation({
    mutationFn: (text: string) =>
      dashboardOrpc.sites.editor.saveDraft.call(saveInput(text)),
    onMutate: () => updateSaveState({ status: "saving" }),
    onSuccess: (result, text) => {
      rememberSaved(text);
      if (pendingRef.current === null) {
        updateSaveState({
          status: "saved",
          savedAt: new Date(result.updatedAt),
        });
      }
      onDraftChange(path, new Date(result.updatedAt));
    },
    onError: (error) => {
      updateSaveState({
        status: "error",
        error: toErrorMessage(error, t("saveFailed")),
      });
    },
  });

  const discardMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.editor.discardDraft.call({
        organizationId,
        siteId,
        path,
      }),
    onSuccess: async () => {
      setContent(null);
      updateSaveState({ status: "idle" });
      onDraftChange(path, null);
      await queryClient.invalidateQueries({ queryKey: readOptions.queryKey });
      setRevision((current) => current + 1);
      toast.success(t("discarded"));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("discardFailed")));
    },
  });

  const cancelPending = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const flush = () => {
    cancelPending();
    const pending = pendingRef.current;
    if (pending !== null) {
      pendingRef.current = null;
      saveMutation.mutate(pending);
    }
  };

  // Leaving the file (or the page) saves what was typed instead of dropping it.
  const flushOnLeave = useEffectEvent(() => {
    cancelPending();
    const pending = pendingRef.current;
    if (pending === null) {
      return;
    }
    pendingRef.current = null;
    void dashboardOrpc.sites.editor.saveDraft
      .call(saveInput(pending))
      .then((result) => {
        rememberSaved(pending);
        onDraftChange(path, new Date(result.updatedAt));
      })
      .catch(() => toast.error(t("saveFailed")));
  });

  useEffect(() => () => flushOnLeave(), []);

  const unsaved = saveState.status === "dirty" || saveState.status === "saving";
  useEffect(() => {
    if (!unsaved) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const handleChange = (next: string) => {
    setContent(next);
    pendingRef.current = next;
    updateSaveState({ status: "dirty" });
    cancelPending();
    timerRef.current = setTimeout(flush, SITE_EDITOR_AUTOSAVE_MS);
  };

  const hasDraft =
    (document?.hasDraft ?? false) ||
    saveState.status === "saved" ||
    saveState.status === "saving";
  const savedAt = saveState.savedAt ?? (hasDraft ? draftUpdatedAt : null);
  const published = document?.published ?? null;
  const unchanged = published !== null && published === value;

  let body: React.ReactNode;
  if (readQuery.isPending || !highlighterReady) {
    body = (
      <div aria-busy="true" className="space-y-3 py-4 ps-14 pe-6">
        {LOADING_LINES.map((width) => (
          <Skeleton className={`h-3 ${width}`} key={width} />
        ))}
      </div>
    );
  } else if (readQuery.isError) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm text-pretty">
          {toErrorMessage(readQuery.error, t("loadFailed"))}
        </p>
        <Button
          onClick={() => {
            void readQuery.refetch();
          }}
          size="sm"
          variant="outline"
        >
          {tPage("retry")}
        </Button>
      </div>
    );
  } else if (mode === "changes" && unchanged) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground"
          icon={GitCompareIcon}
          size={18}
          strokeWidth={1.5}
        />
        <p className="text-muted-foreground max-w-xs text-sm text-pretty">
          {tPage("changes.none")}
        </p>
      </div>
    );
  } else if (mode === "changes") {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SiteFileDiff
          after={value}
          before={published}
          diffStyle={diffStyle}
          path={path}
        />
      </div>
    );
  } else {
    body = (
      <SiteCodeEditor
        diagnostics={diagnostics}
        editStateKey={`${siteEditStateKey(siteId, path)}:${revision}`}
        initialValue={value}
        jump={jump}
        key={revision}
        label={tPage("file.contentLabel", { path })}
        onChange={handleChange}
        onSave={flush}
        path={path}
      />
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SiteEditorFileBar
        diffStyle={diffStyle}
        document={document}
        hasConflict={hasConflict}
        hasDraft={hasDraft}
        isDiscarding={discardMutation.isPending}
        mode={mode}
        onDiffStyleChange={setDiffStyle}
        onDiscard={() => {
          pendingRef.current = null;
          cancelPending();
          discardMutation.mutate();
        }}
        onModeChange={setMode}
        onOpenFilePicker={onOpenFilePicker}
        path={path}
        savedAt={savedAt}
        saveState={saveState}
        site={site}
      />
      {body}
    </div>
  );
}
