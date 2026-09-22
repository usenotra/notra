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
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { DeleteIntegrationDialog } from "@/components/delete-integration-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { AddGranolaIntegrationDialog } from "@/components/integrations/add-granola-integration-dialog";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
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
      toast.success(enabled ? "Integration enabled" : "Integration disabled");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to update integration");
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
      toast.success("Integration deleted");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to delete integration");
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
          <CardTitle>{integration.displayName}</CardTitle>
          <CardDescription>
            {integration.createdByUser ? (
              <>
                Added by {integration.createdByUser.name} on{" "}
                {formatGranolaIntegrationDate(integration.createdAt)}
              </>
            ) : (
              <>
                Created on {formatGranolaIntegrationDate(integration.createdAt)}
              </>
            )}
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              <Badge variant={integration.enabled ? "default" : "secondary"}>
                {integration.enabled ? "Enabled" : "Disabled"}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button disabled={isLoading} size="icon-sm" variant="ghost">
                      <svg
                        aria-label="More options"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>More options</title>
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
                    {integration.enabled ? "Disable" : "Enable"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    variant="destructive"
                  >
                    Delete
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
                : "Granola workspace connected"}
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
          description="Manage your Granola integrations for meeting-based content"
          title="Granola Integrations"
        >
          <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            Connect Granola
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>

        <div>
          {showLoading ? <GranolaIntegrationsPageSkeleton /> : null}

          {!showLoading && isError ? (
            <EmptyState
              action={
                <Button onClick={() => refetch()} size="sm" variant="outline">
                  Retry
                </Button>
              }
              description="Something went wrong while loading your Granola integrations."
              title="Failed to load integrations"
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
                  Connect Granola
                </Button>
              }
              description="Connect Granola to start pulling meeting notes and summaries."
              preview={
                <EmptyStateCardsPreview count={2} variant="integration" />
              }
              title="No integrations yet"
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
