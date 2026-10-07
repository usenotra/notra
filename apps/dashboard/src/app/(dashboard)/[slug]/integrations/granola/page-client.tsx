"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
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
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { DeleteIntegrationDialog } from "@/components/delete-integration-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { AddGranolaIntegrationDialog } from "@/components/integrations/add-granola-integration-dialog";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { formatGranolaIntegrationDate } from "@/lib/granola/format";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GranolaIntegrationCardProps } from "@/types/integrations";

import { GranolaIntegrationsPageSkeleton } from "./skeleton";

interface PageClientProps {
  organizationSlug: string;
}

function GranolaIntegrationCard({
  integration,
  organizationId,
  onUpdate,
}: GranolaIntegrationCardProps) {
  const t = useTranslations("integrations.granolaPage");
  const tCard = useTranslations("integrations.card");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return dashboardOrpc.integrations.granola.update.call({
        organizationId,
        integrationId: integration.id,
        enabled,
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.granola.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success(enabled ? tCard("enabledToast") : tCard("disabledToast"));
      onUpdate?.();
    },
    onError: () => {
      toast.error(tCard("updateFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return dashboardOrpc.integrations.granola.delete.call({
        organizationId,
        integrationId: integration.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.granola.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success(tCard("deleted"));
      onUpdate?.();
    },
    onError: () => {
      toast.error(tCard("deleteFailed"));
    },
  });

  const handleToggle = () => {
    toggleMutation.mutate(!integration.enabled);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const isLoading = toggleMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="wrap-anywhere">
            {integration.displayName}
          </CardTitle>
          <CardDescription>
            {integration.createdByUser
              ? tCard("addedBy", {
                  name: integration.createdByUser.name,
                  date: formatGranolaIntegrationDate(
                    integration.createdAt,
                    locale
                  ),
                })
              : tCard("createdOn", {
                  date: formatGranolaIntegrationDate(
                    integration.createdAt,
                    locale
                  ),
                })}
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
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
                    onClick={handleToggle}
                  >
                    {integration.enabled
                      ? tCommon("actions.disable")
                      : tCommon("actions.enable")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setIsDeleteDialogOpen(true)}
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
            <p>
              {integration.workspaceName
                ? integration.workspaceName
                : t("workspaceConnected")}
            </p>
          </div>
        </CardContent>
      </Card>
      <DeleteIntegrationDialog
        affectedSchedules={[]}
        integrationName={integration.displayName}
        isDeleting={deleteMutation.isPending}
        isLoadingSchedules={false}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      />
    </>
  );
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const t = useTranslations("integrations.granolaPage");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const [dialogOpen, setDialogOpen] = useState(false);

  useHotkey("C", () => setDialogOpen(true), { enabled: !dialogOpen });

  const {
    data: response,
    isLoading: isLoadingIntegrations,
    isError,
    refetch,
  } = useQuery(
    dashboardOrpc.integrations.granola.list.queryOptions({
      input: { organizationId: organization?.id ?? "" },
      enabled: !!organization?.id,
    })
  );

  const integrations = response?.integrations;
  const showLoading = !!organization?.id && isLoadingIntegrations && !response;

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tIntegrationsShared("granolaIntegrations")}
        >
          <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {t("connect")}
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>

        <div>
          {showLoading ? <GranolaIntegrationsPageSkeleton /> : null}

          {!showLoading && isError ? (
            <EmptyState
              action={
                <Button onClick={() => refetch()} size="sm" variant="outline">
                  {tCommon("actions.retry")}
                </Button>
              }
              description={t("loadFailedDescription")}
              title={t("loadFailedTitle")}
            />
          ) : null}

          {!(showLoading || isError) &&
          (!integrations || integrations.length === 0) ? (
            <EmptyState
              action={
                <Button
                  onClick={() => setDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  {t("connect")}
                </Button>
              }
              description={t("emptyDescription")}
              preview={
                <EmptyStateCardsPreview count={2} variant="integration" />
              }
              title={tIntegrationsShared("noIntegrationsYet")}
            />
          ) : null}

          {!showLoading && integrations && integrations.length > 0 ? (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <GranolaIntegrationCard
                  integration={integration}
                  key={integration.id}
                  onUpdate={() => refetch()}
                  organizationId={organization?.id ?? ""}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <AddGranolaIntegrationDialog
        onOpenChange={setDialogOpen}
        onSuccess={() => refetch()}
        open={dialogOpen}
        organizationId={organization?.id ?? ""}
      />
    </PageContainer>
  );
}
