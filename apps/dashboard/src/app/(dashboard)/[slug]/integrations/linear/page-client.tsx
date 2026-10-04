"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import type { MouseEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { DeleteIntegrationDialog } from "@/components/delete-integration-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { AddLinearIntegrationDialog } from "@/components/integrations/add-linear-integration-dialog";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useLinearConnectionToast } from "@/lib/hooks/use-linear-connection-toast";
import { usePathname, useRouter } from "@/lib/navigation";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { LinearIntegration } from "@/types/integrations";

import { LinearIntegrationsPageSkeleton } from "./skeleton";

interface PageClientProps {
  organizationSlug: string;
}

function LinearIntegrationCard({
  integration,
  organizationId,
  organizationSlug,
  onUpdate,
}: {
  integration: LinearIntegration;
  organizationId: string;
  organizationSlug: string;
  onUpdate?: () => void;
}) {
  const t = useTranslations("integrations.linearPage");
  const tCard = useTranslations("integrations.card");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return dashboardOrpc.integrations.linear.update.call({
        organizationId,
        integrationId: integration.id,
        enabled,
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.linear.list.queryKey({
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
      return dashboardOrpc.integrations.linear.delete.call({
        organizationId,
        integrationId: integration.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.linear.list.queryKey({
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

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-no-card-click]")) {
      return;
    }
    const destination = `/${organizationSlug}/integrations/linear/${integration.id}`;
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
            {integration.createdByUser
              ? tCard("addedBy", {
                  name: integration.createdByUser.name,
                  date: new Date(integration.createdAt).toLocaleDateString(
                    locale
                  ),
                })
              : tCard("createdOn", {
                  date: new Date(integration.createdAt).toLocaleDateString(
                    locale
                  ),
                })}
          </CardDescription>
          <CardAction>
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
                      setIsDeleteDialogOpen(true);
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
            {integration.linearOrganizationName ? (
              <p>
                {integration.linearOrganizationName}
                {integration.linearTeamName
                  ? ` / ${integration.linearTeamName}`
                  : ""}
              </p>
            ) : (
              <p>{t("workspaceConnected")}</p>
            )}
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
  const t = useTranslations("integrations.linearPage");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);

  useHotkey("C", () => setDialogOpen(true), { enabled: !dialogOpen });

  useLinearConnectionToast();

  const {
    data: response,
    isLoading: isLoadingIntegrations,
    refetch,
  } = useQuery(
    dashboardOrpc.integrations.linear.list.queryOptions({
      input: { organizationId: organization?.id ?? "" },
      enabled: !!organization?.id,
    })
  );

  const integrations = response?.integrations;
  const showLoading = !!organization?.id && isLoadingIntegrations && !response;

  const authorizeUrl = `/api/integrations/linear/authorize?organizationId=${organization?.id ?? ""}&callbackPath=${encodeURIComponent(pathname)}`;

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tIntegrationsShared("linearIntegrations")}
        >
          <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {t("connect")}
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>

        <div>
          {showLoading ? <LinearIntegrationsPageSkeleton /> : null}

          {!showLoading && (!integrations || integrations.length === 0) ? (
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
                <LinearIntegrationCard
                  integration={integration}
                  key={integration.id}
                  onUpdate={() => refetch()}
                  organizationId={organization?.id ?? ""}
                  organizationSlug={organizationSlug}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <AddLinearIntegrationDialog
        authorizeUrl={authorizeUrl}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </PageContainer>
  );
}
