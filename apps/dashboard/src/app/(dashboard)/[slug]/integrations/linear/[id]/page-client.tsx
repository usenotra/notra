"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { LinearIntegration } from "@/types/integrations";

import { LinearIntegrationDetailSkeleton } from "./skeleton";

const EditLinearIntegrationDialog = dynamic(
  () =>
    import("@/components/integrations/edit-linear-integration-dialog").then(
      (mod) => ({
        default: mod.EditLinearIntegrationDialog,
      })
    ),
  { ssr: false }
);

interface PageClientProps {
  integrationId: string;
}

export default function PageClient({ integrationId }: PageClientProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;

  const { data, isLoading: isLoadingIntegration } = useQuery({
    ...dashboardOrpc.integrations.linear.get.queryOptions({
      input: {
        organizationId: organizationId ?? "",
        integrationId,
      },
    }),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const integration =
    data && "id" in data ? (data as LinearIntegration) : undefined;

  if (!organizationId) {
    return null;
  }

  if (isLoadingIntegration && !integration) {
    return <LinearIntegrationDetailSkeleton />;
  }

  if (!integration) {
    return <LinearIntegrationMissing />;
  }

  return (
    <LinearIntegrationLoaded
      editDialogOpen={editDialogOpen}
      integration={integration}
      onEditOpenChange={setEditDialogOpen}
      organizationId={organizationId}
    />
  );
}

function LinearIntegrationMissing() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="rounded-xl border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">Integration not found</h3>
          <p className="text-muted-foreground text-sm">
            This integration may have been deleted or you don't have access to
            it.
          </p>
        </div>
      </div>
    </div>
  );
}

function LinearIntegrationLoaded({
  editDialogOpen,
  integration,
  onEditOpenChange,
  organizationId,
}: {
  editDialogOpen: boolean;
  integration: LinearIntegration;
  onEditOpenChange: (open: boolean) => void;
  organizationId: string;
}) {
  const formattedDate = format(new Date(integration.createdAt), "MMM d, yyyy");
  const createdLabel = integration.createdByUser
    ? `Added by ${integration.createdByUser.name} on ${formattedDate}`
    : `Created on ${formattedDate}`;
  const statusLabel = integration.enabled ? "Enabled" : "Disabled";

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <h1 className="text-3xl font-bold tracking-tight">
                      <span className="cursor-help">
                        {integration.displayName}
                      </span>
                    </h1>
                  }
                />
                <TooltipContent>{createdLabel}</TooltipContent>
              </Tooltip>
              <Badge variant={integration.enabled ? "default" : "secondary"}>
                {statusLabel}
              </Badge>
            </div>
            {integration.linearOrganizationName ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Linear className="size-4 shrink-0" />
                <span>{integration.linearOrganizationName}</span>
                {integration.linearTeamName ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="bg-muted-foreground/70 size-1 rounded-full"
                    />
                    <span>{integration.linearTeamName}</span>
                  </>
                ) : null}
              </div>
            ) : null}
            <p className="text-muted-foreground">
              Configure your Linear integration settings
            </p>
          </div>
          <Button
            onClick={() => onEditOpenChange(true)}
            size="sm"
            variant="outline"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Edit icon</title>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="ml-2">Edit</span>
          </Button>
        </div>

        <EditLinearIntegrationDialog
          integration={integration}
          onOpenChange={onEditOpenChange}
          open={editDialogOpen}
          organizationId={organizationId}
        />

        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Details</h2>
            <div className="divide-y rounded-lg border">
              {integration.linearOrganizationName ? (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm font-medium">Workspace</span>
                  <span className="text-muted-foreground text-sm">
                    {integration.linearOrganizationName}
                  </span>
                </div>
              ) : null}
              {integration.linearTeamName ? (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm font-medium">Team</span>
                  <span className="text-muted-foreground text-sm">
                    {integration.linearTeamName}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={integration.enabled ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm font-medium">Created</span>
                <span className="text-muted-foreground text-sm">
                  {createdLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
