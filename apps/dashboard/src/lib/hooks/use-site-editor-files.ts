import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  UseCreateSiteFileParams,
  UseRebaseSiteDraftsParams,
  UseValidateSiteDraftsParams,
} from "@/types/hooks/sites";
import type {
  SiteEditorNewFile,
  SiteEditorDraftResult,
} from "@/types/site-editor";
import type { SiteScope } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { listSiteEditorFiles } from "@/utils/site-editor";

export function useSiteEditorFiles({ organizationId, siteId }: SiteScope) {
  const queryClient = useQueryClient();
  const filesOptions = dashboardOrpc.sites.editor.files.queryOptions({
    input: { organizationId, siteId },
    refetchOnWindowFocus: false,
  });
  const filesQuery = useQuery(filesOptions);
  const data = filesQuery.data ?? null;
  const treeFiles = useMemo(
    () => listSiteEditorFiles(data?.files ?? [], data?.drafts ?? []),
    [data]
  );
  const editablePaths = new Set(
    treeFiles.filter((file) => file.editable).map((file) => file.path)
  );
  const sourcePaths = new Set((data?.files ?? []).map((file) => file.path));

  const refreshDrafts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: filesOptions.queryKey }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.sites.get.key(),
      }),
    ]);
  };

  const applyDraftChange = (
    path: string,
    updatedAt: Date | null,
    draft: SiteEditorDraftResult | null
  ) => {
    queryClient.setQueryData(filesOptions.queryKey, (current) => {
      if (!current) {
        return current;
      }
      const others = current.drafts.filter((draft) => draft.path !== path);
      if (updatedAt === null) {
        return { ...current, drafts: others };
      }
      if (!draft) {
        return current;
      }
      const existing = current.drafts.find((draft) => draft.path === path);
      const source = current.files.find((file) => file.path === path);
      return {
        ...current,
        drafts: [
          ...others,
          {
            path,
            id: draft.draftId,
            revision: draft.draftRevision,
            deleted: false,
            baseBlobSha: existing?.baseBlobSha ?? (source?.sha || null),
            updatedAt,
          },
        ],
      };
    });
    void queryClient.invalidateQueries({
      queryKey: dashboardOrpc.sites.get.key(),
    });
  };

  return {
    filesQuery,
    data,
    drafts: data?.drafts ?? [],
    treeFiles,
    editablePaths,
    sourcePaths,
    baseCommitSha: data?.commitSha ?? null,
    refreshDrafts,
    applyDraftChange,
  };
}

export function useRebaseSiteDrafts({
  organizationId,
  siteId,
  onRebased,
  onSettled,
}: UseRebaseSiteDraftsParams) {
  const t = useTranslations("sites.editor");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paths: string[]) => {
      const filesOptions = dashboardOrpc.sites.editor.files.queryOptions({
        input: { organizationId, siteId },
      });
      const files = queryClient.getQueryData(filesOptions.queryKey);
      if (!files) {
        throw new Error("Reload the editor files before rebasing");
      }
      const results = await Promise.allSettled(
        paths.map((path) => {
          const draft = files.drafts.find((entry) => entry.path === path);
          return dashboardOrpc.sites.editor.rebaseDraft.call({
            organizationId,
            siteId,
            path,
            draftId: draft?.id ?? null,
            draftRevision: draft?.revision ?? null,
            sourceContext: files.sourceContext,
          });
        })
      );
      const readOptions = paths.map((path) =>
        dashboardOrpc.sites.editor.read.queryOptions({
          input: { organizationId, siteId, path },
        })
      );
      await Promise.all(
        [filesOptions, ...readOptions].map(async (options) => {
          const filter = { queryKey: options.queryKey, exact: true };
          await queryClient.cancelQueries(filter);
          await queryClient.resetQueries(filter);
        })
      );
      const refreshed = await Promise.allSettled([
        ...readOptions.map((options) =>
          queryClient.fetchQuery({ ...options, staleTime: Infinity })
        ),
        queryClient.fetchQuery({ ...filesOptions, staleTime: Infinity }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.sites.get.key(),
        }),
      ]);
      const failure = [...results, ...refreshed].find(
        (result) => result.status === "rejected"
      );
      onSettled(paths);
      if (failure?.status === "rejected") {
        throw failure.reason;
      }
    },
    onSuccess: () => {
      onRebased();
      toast.success(t("conflict.rebased"));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("conflict.rebaseFailed")));
    },
  });
}

export function useValidateSiteDrafts({
  organizationId,
  siteId,
  onValidated,
}: UseValidateSiteDraftsParams) {
  const t = useTranslations("sites.editor");
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.editor.validate.call({ organizationId, siteId }),
    onSuccess: (result) => onValidated(result.diagnostics),
    onError: (error) => {
      toast.error(toErrorMessage(error, t("validateFailed")));
    },
  });
}

export function useCreateSiteFile({
  organizationId,
  siteId,
  baseCommitSha,
  sourceContext,
  refreshDrafts,
  onSaved,
  onCreated,
}: UseCreateSiteFileParams) {
  const t = useTranslations("sites.editor");
  return useMutation({
    mutationFn: (file: SiteEditorNewFile) =>
      dashboardOrpc.sites.editor.saveDraft.call({
        organizationId,
        siteId,
        path: file.path,
        content: file.content,
        baseBlobSha: null,
        baseCommitSha,
        draftId: null,
        draftRevision: null,
        sourceContext,
      }),
    onSuccess: async (result) => {
      onSaved();
      await refreshDrafts();
      onCreated(result.path);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("createFailed")));
    },
  });
}
