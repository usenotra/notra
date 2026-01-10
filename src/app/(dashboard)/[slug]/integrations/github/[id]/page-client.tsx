"use client";

import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { RepositoryList } from "@/components/integrations/repository-list";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

const EditIntegrationDialog = dynamic(
  () =>
    import("@/components/integrations/edit-integration-dialog").then((mod) => ({
      default: mod.EditIntegrationDialog,
    })),
  { ssr: false }
);

interface PageClientProps {
  integrationId: string;
}

export default function PageClient({ integrationId }: PageClientProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;

  const integration = useQuery(
    api.integrations.get,
    organizationId
      ? { integrationId: integrationId as Id<"githubIntegrations"> }
      : "skip"
  );

  const isLoading = integration === undefined;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="rounded-xl border border-dashed p-12 text-center">
            <h3 className="font-medium text-lg">Integration not found</h3>
            <p className="text-muted-foreground text-sm">
              This integration may have been deleted or you don't have access to
              it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const integrationData = {
    id: integration._id,
    displayName: integration.displayName,
    enabled: integration.enabled,
    createdAt: integration.createdAt,
    createdByUser: integration.createdByUser,
    repositories: integration.repositories.map((r) => ({
      id: r._id,
      owner: r.owner,
      repo: r.repo,
      enabled: r.enabled,
    })),
  };

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">
              {integration.displayName}
            </h1>
            <p className="text-muted-foreground">
              Configure your GitHub integration and manage repositories
            </p>
          </div>
          <Button
            onClick={() => setEditDialogOpen(true)}
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

        <EditIntegrationDialog
          integration={integrationData}
          onOpenChange={setEditDialogOpen}
          open={editDialogOpen}
        />

        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Integration Details</h2>
                <p className="text-muted-foreground text-sm">
                  {integration.createdByUser ? (
                    <>
                      Added by {integration.createdByUser.name} on{" "}
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </>
                  ) : (
                    <>
                      Created on{" "}
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <Badge variant={integration.enabled ? "default" : "secondary"}>
                {integration.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Content Outputs</h2>
            <RepositoryList integrationId={integrationId} />
          </div>
        </div>
      </div>
    </div>
  );
}
