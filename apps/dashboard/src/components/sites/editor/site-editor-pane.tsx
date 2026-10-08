"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SiteCodeEditor } from "@/components/sites/editor/site-code-editor";
import { SiteEditorFileBar } from "@/components/sites/editor/site-editor-file-bar";
import { SiteEditorPaneBody } from "@/components/sites/editor/site-editor-pane-body";
import { SITE_EDITOR_AUTOSAVE_MS } from "@/constants/sites";
import { useSiteCodeHighlighter } from "@/lib/hooks/use-site-code-highlighter";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteEditorPaneProps } from "@/types/components/site-editor";
import type { SiteEditorMode } from "@/types/site-editor";
import { siteEditorHasDraft, siteEditStateKey } from "@/utils/site-editor";

export function SiteEditorPane({
  organizationId,
  siteId,
  site,
  path,
  baseCommitSha,
  diagnostics,
  jump,
  saveQueue,
  onOpenFilePicker,
}: SiteEditorPaneProps) {
  const t = useTranslations("sites.editor");
  const tPage = useTranslations("sites.editorPage");
  const readOptions = dashboardOrpc.sites.editor.read.queryOptions({
    input: { organizationId, siteId, path },
    refetchOnWindowFocus: false,
  });
  const readQuery = useQuery(readOptions);
  const highlighterReady = useSiteCodeHighlighter();
  const document = readQuery.data ?? null;
  const saved = useSyncExternalStore(
    saveQueue.subscribe,
    saveQueue.getSnapshot,
    saveQueue.getSnapshot
  );
  const saveState = saved.state;
  const isDiscarding = saveState.status === "discarding";
  const [mode, setMode] = useState<SiteEditorMode>("edit");
  const revision = saved.revision;
  const [seenJump, setSeenJump] = useState(jump);
  if (jump !== seenJump) {
    setSeenJump(jump);
    if (jump) {
      setMode("edit");
    }
  }
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = saved.content ?? document?.content ?? "";

  const saveInput = (text: string) => ({
    organizationId,
    siteId,
    path,
    content: text,
    baseBlobSha: document?.blobSha ?? null,
    baseCommitSha,
    draftId: document?.draftId ?? null,
    draftRevision: document?.draftRevision ?? null,
    sourceContext: document?.sourceContext ?? {
      productionBranch: site.productionBranch,
      rootDirectory: site.rootDirectory,
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
    void saveQueue.flush();
  };

  const flushOnLeave = useEffectEvent(flush);

  useEffect(() => () => flushOnLeave(), []);

  const discard = async () => {
    cancelPending();
    try {
      await saveQueue.discard(saveInput(value));
      toast.success(t("discarded"));
    } catch {
      toast.error(t("discardFailed"));
    }
  };

  const handleChange = (next: string) => {
    saveQueue.edit(saveInput(next));
    cancelPending();
    timerRef.current = setTimeout(flush, SITE_EDITOR_AUTOSAVE_MS);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SiteEditorFileBar
        document={document}
        hasDraft={siteEditorHasDraft(document, saveState)}
        isDiscarding={isDiscarding}
        mode={mode}
        onDiscard={() => {
          void discard();
        }}
        onModeChange={setMode}
        onOpenFilePicker={onOpenFilePicker}
        path={path}
        saveState={saveState}
        site={site}
      />
      <div className="flex min-h-0 flex-1 flex-col" inert={isDiscarding}>
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
    </div>
  );
}
