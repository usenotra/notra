"use client";

import { InstalledIntegrationCard } from "@/components/integrations-card";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { TitleCard } from "@/components/title-card";
import {
  ALL_INTEGRATIONS,
  INTEGRATION_CATEGORY_MAP,
  INPUT_SOURCES,
  OUTPUT_SOURCES,
} from "@/lib/integrations/catalog";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import type { IntegrationsResponse } from "@/lib/services/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";

const TAB_VALUES = ["all", "installed"] as const;

const AddIntegrationDialog = dynamic(
  () =>
    import("@/components/integrations/add-integration-dialog").then((mod) => ({
      default: mod.AddIntegrationDialog,
    })),
  { ssr: false },
);

interface Integration {
  id: string;
  displayName: string;
  type: IntegrationType;
  enabled: boolean;
  createdAt: Date;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    enabled: boolean;
  }>;
}

interface PageClientProps {
  organizationSlug: string;
}

import type { IntegrationConfig } from "@/lib/integrations/catalog";
import { IntegrationType } from "@/utils/schemas/integrations";

function IntegrationCard({
  integration,
  activeCount,
  isLoading,
}: {
  integration: IntegrationConfig;
  activeCount: number;
  isLoading?: boolean;
}) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const organizationSlug = activeOrganization?.slug;
  const isActive = activeCount > 0;
  const [dialogOpen, setDialogOpen] = useState(false);
  const showConnectButton = integration.available;
  const showComingSoon = !integration.available;
  const showDialog = integration.available && integration.id === "github";

  if (!(organizationId && organizationSlug)) {
    return null;
  }

  const cardContent = (
    <TitleCard
      accentColor={integration.accentColor}
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isLoading && <Skeleton className="h-5 w-8 rounded-full" />}
          {!isLoading && isActive && (
            <Badge className="text-xs" variant="default">
              {activeCount}
            </Badge>
          )}
          {showConnectButton ? (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDialogOpen(true);
              }}
              size="sm"
              variant="outline"
            >
              Connect
            </Button>
          ) : null}
          {showComingSoon ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    disabled
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Soon
                  </Button>
                }
              />
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      }
      className={
        integration.available
          ? "cursor-pointer transition-colors hover:bg-muted/80"
          : ""
      }
      heading={integration.name}
      icon={integration.icon}
    >
      <p className="line-clamp-2 text-muted-foreground text-sm">
        {integration.description}
      </p>
    </TitleCard>
  );

  return (
    <>
      {integration.available ? (
        <Link
          className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/${organizationSlug}/integrations/${integration.href}`}
        >
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
      {showDialog ? (
        <AddIntegrationDialog
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            setDialogOpen(false);
          }}
          open={dialogOpen}
          organizationId={organizationId}
        />
      ) : null}
    </>
  );
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id;

  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TAB_VALUES).withDefault("all"),
  );

  const { data, isLoading, refetch } = useQuery<IntegrationsResponse>({
    queryKey: QUERY_KEYS.INTEGRATIONS.all(organizationId ?? ""),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await fetch(
        `/api/organizations/${organizationId}/integrations`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch integrations");
      }

      const result: IntegrationsResponse = await response.json();
      return result;
    },
    enabled: !!organizationId,
  });

  const integrations = data?.integrations;
  const installedCount = data?.count ?? 0;

  if (!organizationId) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">Integrations</h1>
            <p className="text-muted-foreground">
              Please select an organization to view integrations
            </p>
          </div>
        </div>
      </div>
    );
  }

  const integrationsByType = integrations?.reduce<
    Record<string, Integration[]>
  >((acc, integration) => {
    const existing = acc[integration.type];
    if (existing) {
      existing.push(integration);
    } else {
      acc[integration.type] = [integration];
    }
    return acc;
  }, {});

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external services to automate your workflows
          </p>
        </div>

        <Tabs onValueChange={(value) => setActiveTab(value)} value={activeTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="installed">
              Installed{installedCount > 0 ? ` (${installedCount})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="space-y-8 pt-4">
              <section>
                <h2 className="mb-4 font-semibold text-lg">Input Sources</h2>
                <p className="mb-4 text-muted-foreground text-sm">
                  Connect services to pull data and updates from
                </p>
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                  {INPUT_SOURCES.map((integration) => (
                    <IntegrationCard
                      activeCount={
                        integrationsByType?.[integration.id]?.length || 0
                      }
                      integration={integration}
                      isLoading={isLoading}
                      key={integration.id}
                    />
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-semibold text-lg">Output Sources</h2>
                <p className="mb-4 text-muted-foreground text-sm">
                  Connect services to publish and sync content to
                </p>
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                  {OUTPUT_SOURCES.map((integration) => (
                    <IntegrationCard
                      activeCount={
                        integrationsByType?.[integration.id]?.length || 0
                      }
                      integration={integration}
                      isLoading={isLoading}
                      key={integration.id}
                    />
                  ))}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="installed">
            <div className="space-y-8 pt-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    Loading installed integrations...
                  </p>
                </div>
              ) : (
                (() => {
                  const inputIntegrations =
                    integrations?.filter(
                      (i) => INTEGRATION_CATEGORY_MAP[i.type] === "input",
                    ) ?? [];
                  const outputIntegrations =
                    integrations?.filter(
                      (i) => INTEGRATION_CATEGORY_MAP[i.type] === "output",
                    ) ?? [];
                  const hasAnyIntegrations =
                    inputIntegrations.length > 0 ||
                    outputIntegrations.length > 0;

                  if (!hasAnyIntegrations) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground">
                          No integrations installed yet.
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Switch to the "All" tab to browse and connect
                          integrations.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {inputIntegrations.length > 0 && (
                        <section>
                          <h2 className="mb-4 font-semibold text-lg">
                            Input Sources
                          </h2>
                          <p className="mb-4 text-muted-foreground text-sm">
                            Connected services pulling data and updates
                          </p>
                          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            {inputIntegrations.map((integration) => {
                              const config = ALL_INTEGRATIONS.find(
                                (i) => i.id === integration.type,
                              );
                              return (
                                <InstalledIntegrationCard
                                  accentColor={config?.accentColor}
                                  icon={config?.icon}
                                  integration={integration}
                                  key={integration.id}
                                  onUpdate={() => refetch()}
                                  organizationId={organizationId}
                                  organizationSlug={organizationSlug}
                                />
                              );
                            })}
                          </div>
                        </section>
                      )}

                      {outputIntegrations.length > 0 && (
                        <section>
                          <h2 className="mb-4 font-semibold text-lg">
                            Output Sources
                          </h2>
                          <p className="mb-4 text-muted-foreground text-sm">
                            Connected services publishing and syncing content
                          </p>
                          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            {outputIntegrations.map((integration) => {
                              const config = ALL_INTEGRATIONS.find(
                                (i) => i.id === integration.type,
                              );
                              return (
                                <InstalledIntegrationCard
                                  accentColor={config?.accentColor}
                                  icon={config?.icon}
                                  integration={integration}
                                  key={integration.id}
                                  onUpdate={() => refetch()}
                                  organizationId={organizationId}
                                  organizationSlug={organizationSlug}
                                />
                              );
                            })}
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
