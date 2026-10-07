import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SiteEditorSaveQueue,
  SiteEditorSaveState,
} from "@/types/site-editor";
import type { SiteScope } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { isSiteEditorUnsaved } from "@/utils/site-editor";
import { createSiteEditorSaveQueue } from "@/utils/site-editor-save-queue";

export function useSiteEditorSaves(
  scope: SiteScope,
  onDraftChange: (path: string, updatedAt: Date | null) => void
) {
  const queryClient = useQueryClient();
  const t = useTranslations("sites.editor");
  const [states, setStates] = useState<Record<string, SiteEditorSaveState>>({});
  const queues = useRef(new Map<string, SiteEditorSaveQueue>()).current;
  const scopeKey = `${scope.organizationId}:${scope.siteId}:`;

  const getQueue = (path: string) => {
    const key = `${scopeKey}${path}`;
    const existing = queues.get(key);
    if (existing) {
      return existing;
    }
    const readOptions = dashboardOrpc.sites.editor.read.queryOptions({
      input: { ...scope, path },
    });
    const queue = createSiteEditorSaveQueue({
      save: (input) => dashboardOrpc.sites.editor.saveDraft.call(input),
      discard: async () => {
        await dashboardOrpc.sites.editor.discardDraft.call({ ...scope, path });
      },
      onSaved: (input, result) => {
        queryClient.setQueryData(readOptions.queryKey, (current) =>
          current
            ? { ...current, content: input.content, hasDraft: true }
            : current
        );
        onDraftChange(path, new Date(result.updatedAt));
      },
      onDiscarded: async () => {
        queryClient.setQueryData(readOptions.queryKey, (current) =>
          current
            ? {
                ...current,
                content: current.published ?? "",
                hasDraft: false,
                blobSha: current.publishedBlobSha,
              }
            : current
        );
        onDraftChange(path, null);
        await queryClient.invalidateQueries({ queryKey: readOptions.queryKey });
      },
      onStateChange: (state) =>
        setStates((current) => ({ ...current, [key]: state })),
      errorMessage: (error) => toErrorMessage(error, t("saveFailed")),
    });
    queues.set(key, queue);
    return queue;
  };

  return {
    getQueue,
    unsaved: Object.entries(states).some(
      ([key, state]) => key.startsWith(scopeKey) && isSiteEditorUnsaved(state)
    ),
    reset: () => {
      queues.clear();
      setStates({});
    },
  };
}
