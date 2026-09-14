import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useGitHubRepositoriesDb } from "@/lib/hooks/use-github-repositories-db";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubRepositoryActionsProps,
  GitHubRepositoryDialog,
} from "@/types/integrations/github";

export function useGitHubRepositoryActions({
  integration,
  organizationId,
}: Pick<GitHubRepositoryActionsProps, "integration" | "organizationId">) {
  const db = useGitHubRepositoriesDb(organizationId);
  const isEnabled =
    integration.enabled &&
    integration.repositories.every((repository) => repository.enabled);
  const isPending = db.pendingRepositoryIds.has(integration.id);
  const [dialog, setDialog] = useState<GitHubRepositoryDialog>(null);
  const affectedSchedules = useQuery({
    ...dashboardOrpc.integrations.affectedSchedules.queryOptions({
      input: { organizationId, integrationId: integration.id },
    }),
    staleTime: 60 * 1000,
    enabled: dialog === "delete",
  });
  const toggle = () => {
    void db.setRepositoryEnabled(integration.id, !isEnabled).catch(() => {});
  };
  const remove = () => {
    setDialog(null);
    void db.removeRepository(integration.id).catch(() => {});
  };
  return {
    isEnabled,
    isPending,
    dialog,
    setDialog,
    affectedSchedules,
    toggle,
    remove,
  };
}
