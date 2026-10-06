"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SiteCodeEditor } from "@/components/sites/editor/site-code-editor";
import { SiteEditorFileBar } from "@/components/sites/editor/site-editor-file-bar";
import { SiteEditorPaneBody } from "@/components/sites/editor/site-editor-pane-body";
import { SITE_EDITOR_AUTOSAVE_MS } from "@/constants/sites";
import { useSiteCodeHighlighter } from "@/lib/hooks/use-site-code-highlighter";
import { useWarnBeforeUnload } from "@/lib/hooks/use-warn-before-unload";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteEditorPaneProps } from "@/types/components/site-editor";
import type { SiteEditorMode, SiteEditorSaveState } from "@/types/site-editor";
import { toErrorMessage } from "@/utils/error-message";
import {
  isSiteEditorUnsaved,
  siteEditorHasDraft,
  siteEditStateKey,
} from "@/utils/site-editor";

export function SiteEditorPane({
  organizationId,
  siteId,
  site,
  path,
  baseCommitSha,
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
  const [revision, setRevision] = useState(0);
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
        updateSaveState({ status: "saved" });
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

  useWarnBeforeUnload(isSiteEditorUnsaved(saveState));

  const handleChange = (next: string) => {
    setContent(next);
    pendingRef.current = next;
    updateSaveState({ status: "dirty" });
    cancelPending();
    timerRef.current = setTimeout(flush, SITE_EDITOR_AUTOSAVE_MS);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SiteEditorFileBar
        document={document}
        hasDraft={siteEditorHasDraft(document, saveState)}
        isDiscarding={discardMutation.isPending}
        mode={mode}
        onDiscard={() => {
          pendingRef.current = null;
          cancelPending();
          discardMutation.mutate();
        }}
        onModeChange={setMode}
        onOpenFilePicker={onOpenFilePicker}
        path={path}
        saveState={saveState}
        site={site}
      />
      <SiteEditorPaneBody
        error={readQuery.isError ? readQuery.error : null}
        isLoading={readQuery.isPending || !highlighterReady}
        mode={mode}
        onRetry={() => {
          void readQuery.refetch();
        }}
        path={path}
        published={document?.published ?? null}
        value={value}
      >
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
      </SiteEditorPaneBody>
    </div>
  );
}
