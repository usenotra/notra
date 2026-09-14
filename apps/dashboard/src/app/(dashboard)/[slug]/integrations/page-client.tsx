"use client";

import type { IntegrationType } from "@notra/schemas/dashboard/integrations";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { memo, useState } from "react";

import { Button } from "@/components/button";
import {
  IntegrationCardDither,
  useIntegrationCardDither,
} from "@/components/integrations/integration-card-dither";
import { IntegrationConnectDialog } from "@/components/integrations/integration-connect-dialog";
import { McpIntegrationCard } from "@/components/integrations/mcp-integration-card";
import { StoreIntegrationsSection } from "@/components/integrations/store-integrations-section";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useLinearConnectionToast } from "@/lib/hooks/use-linear-connection-toast";
import { useSlackConnectionToast } from "@/lib/hooks/use-slack-connection-toast";
import { ALL_INTEGRATIONS } from "@/lib/integrations/catalog";
import {
  INTEGRATION_CATEGORY_TABS,
  INTEGRATION_TAB_VALUES,
  INTEGRATIONS_WITH_CONNECT_DIALOG,
} from "@/lib/integrations/constants";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  IntegrationConfig,
  IntegrationsPageClientProps,
} from "@/types/integrations/catalog";

interface Integration {
  id: string;
  displayName: string;
  type: IntegrationType;
  enabled: boolean;
  createdAt: string;
}

const IntegrationCard = memo(function IntegrationCard({
  integration,
  activeCount,
  isPending,
}: {
  integration: IntegrationConfig;
  activeCount: number;
  isPending?: boolean;
}) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const organizationSlug = activeOrganization?.slug;
  const router = useRouter();
  const isActive = activeCount > 0;
  const [dialogOpen, setDialogOpen] = useState(false);
  const showConnectButton = integration.available;
  const hasConnectDialog =
    integration.available &&
    INTEGRATIONS_WITH_CONNECT_DIALOG.has(integration.id);
  const dither = useIntegrationCardDither(integration.available);

  if (!(organizationId && organizationSlug)) {
    return null;
  }

  const cardContent = (
    <TitleCard
      accentColor={integration.accentColor}
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isPending && isActive && (
            <Badge className="text-xs" variant="default">
              {activeCount}
            </Badge>
          )}
          {showConnectButton ? (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (hasConnectDialog) {
                  setDialogOpen(true);
                } else {
                  router.push(
                    `/${organizationSlug}/integrations/${integration.href}`
                  );
                }
              }}
              size="sm"
              variant="outline"
            >
              {integration.connectLabel ?? "Connect"}
            </Button>
          ) : null}
        </div>
      }
      className={
        integration.available
          ? "hover:bg-muted/80 h-full cursor-pointer transition-colors"
          : "h-full"
      }
      disabled={!integration.available}
      heading={integration.name}
      hoverBackground={
        integration.available ? (
          <IntegrationCardDither
            active={dither.active}
            color={integration.accentColor}
          />
        ) : null
      }
      icon={integration.icon}
    >
      <p className="text-muted-foreground line-clamp-2 text-sm">
        {integration.description}
      </p>
    </TitleCard>
  );

  return (
    <>
      {integration.available ? (
        <Link
          {...dither.interactionProps}
          className="focus-visible:ring-ring h-full rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          href={`/${organizationSlug}/integrations/${integration.href}`}
        >
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
      {hasConnectDialog ? (
        <IntegrationConnectDialog
          integrationId={integration.id}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
      ) : null}
    </>
  );
});

export default function PageClient({
  organizationSlug,
  connectSlug,
}: IntegrationsPageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id;

  useLinearConnectionToast();
  useSlackConnectionToast();

  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(INTEGRATION_TAB_VALUES).withDefault("all")
  );

  const { data, isPending } = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );

  const integrations = data?.integrations;

  if (!organizationId) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
            <p className="text-muted-foreground">
              Please select an organization to view integrations
            </p>
          </div>
        </div>
      </PageContainer>
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
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external services to automate your workflows
          </p>
        </div>

        <Tabs onValueChange={(value) => setActiveTab(value)} value={activeTab}>
          <TabsList variant="line">
            {INTEGRATION_CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {INTEGRATION_CATEGORY_TABS.map((tab) => {
            const items =
              tab.value === "all"
                ? ALL_INTEGRATIONS
                : ALL_INTEGRATIONS.filter((i) => i.category === tab.value);
            const showMcpCard =
              tab.value === "all" ||
              tab.value === "input" ||
              tab.value === "output";

            return (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="grid gap-3 pt-4 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {items.map((integration) => (
                    <IntegrationCard
                      activeCount={
                        integrationsByType?.[integration.id]?.length || 0
                      }
                      integration={integration}
                      isPending={isPending}
                      key={integration.id}
                    />
                  ))}
                  {showMcpCard ? (
                    <McpIntegrationCard
                      organizationId={organizationId}
                      organizationSlug={organizationSlug}
                    />
                  ) : null}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <StoreIntegrationsSection
          connectSlug={connectSlug}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
      </div>
    </PageContainer>
  );
}
