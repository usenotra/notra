"use client";

import { useQuery } from "convex/react";
import { AddIntegrationDialog } from "@/components/integrations/add-integration-dialog";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../../convex/_generated/api";

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);

  const response = useQuery(
    api.integrations.list,
    organization?.id ? { organizationId: organization.id } : "skip"
  );

  const isLoading = response === undefined;
  const integrations = response?.integrations
    ?.filter((i) => i.displayName)
    .map((i) => ({
      id: i._id,
      displayName: i.displayName,
      enabled: i.enabled,
      createdAt: i.createdAt,
      createdByUser: i.createdByUser,
      type: "github" as const,
      repositories: i.repositories.map((r) => ({
        id: r._id,
        owner: r.owner,
        repo: r.repo,
        enabled: r.enabled,
      })),
    }));

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">
              GitHub Integrations
            </h1>
            <p className="text-muted-foreground">
              Manage your GitHub repository integrations and outputs
            </p>
          </div>
          <AddIntegrationDialog
            organizationId={organization?.id ?? ""}
            organizationSlug={organizationSlug}
          />
        </div>

        <div>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}

          {!isLoading && (!integrations || integrations.length === 0) ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <h3 className="font-medium text-lg">No integrations yet</h3>
              <p className="text-muted-foreground text-sm">
                Add your first GitHub integration to get started
              </p>
            </div>
          ) : null}

          {!isLoading && integrations && integrations.length > 0 ? (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <IntegrationCard
                  integration={integration}
                  key={integration.id}
                  organizationSlug={organizationSlug}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
