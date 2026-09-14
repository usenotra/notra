"use client";

import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { useId } from "react";

import { DeleteIntegrationDialog } from "@/components/delete-integration-dialog";
import { EditIntegrationDialog } from "@/components/integrations/edit-integration-dialog";
import { GitHubRepositoryMenu } from "@/components/integrations/github/github-repository-menu";
import { LegacyEditTokenDialog } from "@/components/integrations/legacy/edit-token-dialog";
import { useGitHubRepositoryActions } from "@/hooks/use-github-repository-actions";
import type { GitHubRepositoryActionsProps } from "@/types/integrations/github";

export function GitHubRepositoryActions(props: GitHubRepositoryActionsProps) {
  const { integration, organizationId } = props;
  const pauseSwitchId = useId();
  const {
    isEnabled,
    isPending,
    dialog,
    setDialog,
    affectedSchedules,
    toggle,
    remove,
  } = useGitHubRepositoryActions(props);
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDialog(null);
    }
  };
  return (
    <>
      <div className="flex items-center gap-3">
        <Label
          className="text-muted-foreground cursor-pointer text-xs font-medium"
          htmlFor={pauseSwitchId}
        >
          {isEnabled ? "Active" : "Paused"}
        </Label>
        <Switch
          id={pauseSwitchId}
          nativeButton
          aria-label={
            isEnabled
              ? `Pause ${integration.displayName}`
              : `Enable ${integration.displayName}`
          }
          checked={isEnabled}
          onCheckedChange={toggle}
        />
        <GitHubRepositoryMenu
          {...props}
          isEnabled={isEnabled}
          isPending={false}
          onToggle={toggle}
          onDialog={setDialog}
        />
      </div>
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
        isDeleting={isPending}
        isLoadingSchedules={affectedSchedules.isLoading}
        onConfirm={remove}
        open={dialog === "delete"}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}
