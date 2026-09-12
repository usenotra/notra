import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubRepositoryActionsProps,
  GitHubRepositoryDialog,
} from "@/types/integrations/github";

export function useGitHubRepositoryActions({
  integration,
  organizationId,
}: Pick<GitHubRepositoryActionsProps, "integration" | "organizationId">) {
  const queryClient = useQueryClient();
  const isEnabled =
    integration.enabled &&
    integration.repositories.every((repository) => repository.enabled);
  const [dialog, setDialog] = useState<GitHubRepositoryDialog>(null);
  const affectedSchedules = useQuery({
    ...dashboardOrpc.integrations.affectedSchedules.queryOptions({
      input: { organizationId, integrationId: integration.id },
    }),
    enabled: dialog === "delete",
  });
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.github.app.get.queryKey({
          input: { organizationId },
        }),
      }),
    ]);
  const toggle = useMutation({
    mutationFn: () =>
      dashboardOrpc.integrations.update.call({
        organizationId,
        integrationId: integration.id,
        enabled: !isEnabled,
      }),
    onSuccess: () => {
      toast.success(isEnabled ? "Repository paused" : "Repository enabled");
    },
    onError: (error) => toast.error(error.message),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: () =>
      dashboardOrpc.integrations.delete.call({
        organizationId,
        integrationId: integration.id,
      }),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.automation.key(),
        }),
      ]);
      setDialog(null);
      toast.success("Repository removed");
    },
    onError: (error) => toast.error(error.message),
  });
  return { isEnabled, dialog, setDialog, affectedSchedules, toggle, remove };
}
