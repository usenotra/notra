"use client";

import { useQuery } from "@tanstack/react-query";
import { AddIntegrationDialog } from "@/components/integrations/add-integration-dialog";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { GitHubIntegration } from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";
import { GitHubIntegrationsPageSkeleton } from "./skeleton";

interface IntegrationsResponse {
  integrations: Array<GitHubIntegration & { type: string }>;
  count: number;
}

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);

  const {
    data: response,
    isPending,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.all(organization?.id ?? ""),
    queryFn: async () => {
      if (!organization?.id) {
        throw new Error("Organization not found");
      }

      const res = await fetch(
        `/api/organizations/${organization.id}/integrations`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch integrations");
      }

      return res.json() as Promise<IntegrationsResponse>;
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  const integrations = response?.integrations.filter(
    (i) => i.type === "github"
  );

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
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
            onSuccess={() => refetch()}
            organizationId={organization?.id ?? ""}
            organizationSlug={organizationSlug}
          />
        </div>

        <div>
          {isPending ? <GitHubIntegrationsPageSkeleton /> : null}

          {!isPending && (!integrations || integrations.length === 0) ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <h3 className="font-medium text-lg">No integrations yet</h3>
              <p className="text-muted-foreground text-sm">
                Add your first GitHub integration to get started
              </p>
            </div>
          ) : null}

          {!isPending && integrations && integrations.length > 0 ? (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <IntegrationCard
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
    </PageContainer>
  );
}
