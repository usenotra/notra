"use client";

import type {
  AffectedTriggersData,
  DeleteResourceResponse,
} from "@notra/schemas/dashboard/integrations";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { DeleteIntegrationDialog } from "@/components/delete-integration-dialog";
import { LegacyEditTokenDialog as EditTokenDialog } from "@/components/integrations/legacy/edit-token-dialog";
import { useRouter } from "@/lib/navigation";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { IntegrationCardProps } from "@/types/integrations";

export function IntegrationCard({
  integration,
  organizationId,
  organizationSlug,
  onUpdate,
}: IntegrationCardProps) {
  const t = useTranslations("integrations.card");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditTokenDialogOpen, setIsEditTokenDialogOpen] = useState(false);

  const { data: affectedSchedulesData, isLoading: isLoadingSchedules } =
    useQuery<AffectedTriggersData>({
      ...dashboardOrpc.integrations.affectedSchedules.queryOptions({
        input: {
          organizationId,
          integrationId: integration.id,
        },
      }),
      enabled: isDeleteDialogOpen,
    });

  const affectedSchedules = affectedSchedulesData?.affectedSchedules ?? [];

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return dashboardOrpc.integrations.update.call({
        organizationId,
        integrationId: integration.id,
        enabled,
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.key(),
      });
      toast.success(enabled ? t("enabledToast") : t("disabledToast"));
      onUpdate?.();
    },
    onError: () => {
      toast.error(t("updateFailed"));
    },
  });

  const deleteMutation = useMutation<DeleteResourceResponse, Error, void>({
    mutationFn: async () => {
      return dashboardOrpc.integrations.delete.call({
        organizationId,
        integrationId: integration.id,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.key(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.automation.key(),
      });

      const disabledCount = data.disabledSchedules?.length ?? 0;
      if (disabledCount > 0) {
        toast.success(t("deletedWithSchedules", { count: disabledCount }));
      } else {
        toast.success(t("deleted"));
      }
      onUpdate?.();
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  const handleToggle = () => {
    toggleMutation.mutate(!integration.enabled);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const isLoading = toggleMutation.isPending || deleteMutation.isPending;

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-no-card-click]")) {
      return;
    }
    const destination = `/${organizationSlug}/integrations/github/${integration.id}`;
    router.prefetch(destination);
    router.push(destination);
  };

  return (
    <>
      <Card
        className="hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={handleCardClick}
      >
        <CardHeader>
          <CardTitle className="wrap-anywhere">
            {integration.displayName}
          </CardTitle>
          <CardDescription>
            {integration.connectionMethod === "unauthenticated" ? (
              <span className="block">{t("noCredentials")}</span>
            ) : null}
            {integration.connectionMethod === "personal-access-token" ? (
              <span className="block">
                {tIntegrationsShared("personalAccessToken")}
              </span>
            ) : null}
            {integration.createdByUser
              ? t("addedBy", {
                  name: integration.createdByUser.name,
                  date: new Date(integration.createdAt).toLocaleDateString(
                    locale
                  ),
                })
              : t("createdOn", {
                  date: new Date(integration.createdAt).toLocaleDateString(
                    locale
                  ),
                })}
          </CardDescription>
          <CardAction>
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Event propagation barrier */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Event propagation barrier */}
            <div
              className="flex items-center gap-2"
              data-no-card-click
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              role="presentation"
              tabIndex={-1}
            >
              <Badge variant={integration.enabled ? "default" : "secondary"}>
                {integration.enabled
                  ? tCommon("states.enabled")
                  : tCommon("states.disabled")}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button disabled={isLoading} size="icon-sm" variant="ghost">
                      <svg
                        aria-label={tIntegrationsShared("moreOptions")}
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>{tIntegrationsShared("moreOptions")}</title>
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsEditTokenDialogOpen(true);
                    }}
                  >
                    {integration.connectionMethod === "unauthenticated"
                      ? t("addToken")
                      : t("editToken")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggle();
                    }}
                  >
                    {integration.enabled
                      ? tCommon("actions.disable")
                      : tCommon("actions.enable")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteClick();
                    }}
                    variant="destructive"
                  >
                    {tCommon("actions.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            {integration.repositories.length === 0 ? (
              <p>{t("noRepositories")}</p>
            ) : (
              <p>
                {t("repositoriesConfigured", {
                  count: integration.repositories.length,
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <DeleteIntegrationDialog
        affectedSchedules={affectedSchedules}
        integrationName={integration.displayName}
        isDeleting={deleteMutation.isPending}
        isLoadingSchedules={isLoadingSchedules}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      />
      <EditTokenDialog
        integration={integration}
        onOpenChange={setIsEditTokenDialogOpen}
        open={isEditTokenDialogOpen}
        organizationId={organizationId}
      />
    </>
  );
}
