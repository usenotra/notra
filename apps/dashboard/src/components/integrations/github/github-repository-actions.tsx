"use client";

import { DeleteIntegrationDialog } from "@/components/delete-integration-dialog";
import { EditIntegrationDialog } from "@/components/integrations/edit-integration-dialog";
import { GitHubRepositoryMenu } from "@/components/integrations/github/github-repository-menu";
import { LegacyEditTokenDialog } from "@/components/integrations/legacy/edit-token-dialog";
import { useGitHubRepositoryActions } from "@/hooks/use-github-repository-actions";
import type { GitHubRepositoryActionsProps } from "@/types/integrations/github";

export function GitHubRepositoryActions(props: GitHubRepositoryActionsProps) {
  const { integration, organizationId } = props;
  const { isEnabled, dialog, setDialog, affectedSchedules, toggle, remove } =
    useGitHubRepositoryActions(props);
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDialog(null);
    }
  };
  return (
    <>
      <GitHubRepositoryMenu
        {...props}
        isEnabled={isEnabled}
        isPending={toggle.isPending || remove.isPending}
        onToggle={() => toggle.mutate()}
        onDialog={setDialog}
      />
      {dialog === "edit" ? (
        <EditIntegrationDialog
          integration={integration}
          organizationId={organizationId}
          open
          onOpenChange={handleOpenChange}
        />
      ) : null}
      {dialog === "token" ? (
        <LegacyEditTokenDialog
          integration={integration}
          organizationId={organizationId}
          open
          onOpenChange={handleOpenChange}
        />
      ) : null}
      <DeleteIntegrationDialog
        affectedSchedules={affectedSchedules.data?.affectedSchedules ?? []}
        integrationName={integration.displayName}
        isDeleting={remove.isPending}
        isLoadingSchedules={affectedSchedules.isLoading}
        onConfirm={() => remove.mutate()}
        open={dialog === "delete"}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}
