"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { openMcpOAuthPopup } from "@notra/utils/oauth-popup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { StoreIntegrationCard } from "@/components/integrations/store-integration-card";
import { StoreIntegrationDialogs } from "@/components/integrations/store-integration-dialogs";
import { INTEGRATION_PROVIDERS } from "@/constants/integration-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { buildOrganizationIntegrationsPath } from "@/lib/integrations/deeplink";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  McpStoreIntegration,
  StoreIntegrationsSectionProps,
} from "@/types/integrations/mcp";

export function StoreIntegrationsSection({
  organizationId,
  organizationSlug,
  connectSlug,
}: StoreIntegrationsSectionProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [connectingIntegration, setConnectingIntegration] =
    useState<McpStoreIntegration | null>(null);
  const [confirmingIntegration, setConfirmingIntegration] =
    useState<McpStoreIntegration | null>(null);
  const [managingIntegrationId, setManagingIntegrationId] = useState<
    string | null
  >(null);
  const [dismissedConnectSlug, setDismissedConnectSlug] = useState<
    string | null
  >(null);

  const { data, isPending } = useQuery(
    dashboardOrpc.integrations.mcp.storeList.queryOptions({
      input: { organizationId },
      enabled: Boolean(organizationId),
    })
  );

  const invalidateIntegrations = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.mcp.list.queryKey({
        input: { organizationId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.mcp.storeList.queryKey({
        input: { organizationId },
      }),
    });
  };

  const dismissDeeplink = () => {
    if (!connectSlug || dismissedConnectSlug === connectSlug) {
      return;
    }
    setDismissedConnectSlug(connectSlug);
    router.replace(buildOrganizationIntegrationsPath(organizationSlug), {
      scroll: false,
    });
  };

  const connectPublicMutation = useMutation({
    mutationFn: async (integration: McpStoreIntegration) =>
      dashboardOrpc.integrations.mcp.create.call({
        authType: "none",
        organizationId,
        storeIntegrationId: integration.id,
        name: integration.name,
        url: integration.url,
        description: integration.description,
        headers: {},
      }),
    onSuccess: () => {
      setConfirmingIntegration(null);
      dismissDeeplink();
      invalidateIntegrations();
      toast.success("Integration connected");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const beginOAuthMutation = useMutation({
    mutationFn: async (integration: McpStoreIntegration) =>
      dashboardOrpc.integrations.mcp.beginOAuth.call({
        organizationId,
        storeIntegrationId: integration.id,
        name: integration.name,
        url: integration.url,
        description: integration.description,
        callbackPath: buildOrganizationIntegrationsPath(organizationSlug),
      }),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const connectIntegration = (integration: McpStoreIntegration) => {
    if (integration.authType === "headers") {
      setConnectingIntegration(integration);
      return;
    }

    trackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
      provider: INTEGRATION_PROVIDERS.MCP_STORE,
      auth_type: integration.authType,
      store_integration_id: integration.id,
      via_deeplink: connectSlug !== null && connectSlug !== undefined,
    });

    if (integration.authType === "oauth") {
      const oauthPopup = openMcpOAuthPopup();
      beginOAuthMutation.mutate(integration, {
        onError: () => oauthPopup.close(),
        onSuccess: ({ authorizationUrl }) => {
          oauthPopup.navigate(authorizationUrl);
          setConfirmingIntegration(null);
          dismissDeeplink();
        },
      });
      return;
    }

    connectPublicMutation.mutate(integration);
  };

  const integrations = data?.integrations ?? [];

  const deeplinkIntegration =
    connectSlug && dismissedConnectSlug !== connectSlug
      ? (integrations.find(
          (integration) =>
            integration.slug === connectSlug || integration.id === connectSlug
        ) ?? null)
      : null;

  const activeManagingIntegration =
    integrations.find(
      (integration) => integration.id === managingIntegrationId
    ) ?? (deeplinkIntegration?.connected ? deeplinkIntegration : null);

  const activeConnectingIntegration =
    connectingIntegration ??
    (!deeplinkIntegration?.connected &&
    deeplinkIntegration?.authType === "headers"
      ? deeplinkIntegration
      : null);

  const activeConfirmingIntegration =
    confirmingIntegration ??
    (deeplinkIntegration &&
    !deeplinkIntegration.connected &&
    deeplinkIntegration.authType !== "headers"
      ? deeplinkIntegration
      : null);

  const isConnectPending = (integration: McpStoreIntegration) =>
    (connectPublicMutation.isPending &&
      connectPublicMutation.variables?.id === integration.id) ||
    (beginOAuthMutation.isPending &&
      beginOAuthMutation.variables?.id === integration.id);

  if (!isPending && integrations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          From the integration store
        </h2>
        <p className="text-muted-foreground text-sm">
          MCP servers published by the Notra community. Connect them with your
          own credentials.
        </p>
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2].map((item) => (
            <Skeleton className="h-28 w-full rounded-lg" key={item} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {integrations.map((integration) => (
            <StoreIntegrationCard
              connectPending={isConnectPending(integration)}
              integration={integration}
              key={integration.id}
              onConnect={connectIntegration}
              onManage={(target) => setManagingIntegrationId(target.id)}
            />
          ))}
        </div>
      )}

      <StoreIntegrationDialogs
        confirmingIntegration={activeConfirmingIntegration}
        confirmingPending={
          activeConfirmingIntegration
            ? isConnectPending(activeConfirmingIntegration)
            : false
        }
        connectingIntegration={activeConnectingIntegration}
        managingIntegration={activeManagingIntegration}
        onConfirmConnect={() => {
          if (activeConfirmingIntegration) {
            connectIntegration(activeConfirmingIntegration);
          }
        }}
        onConfirmingClose={() => {
          setConfirmingIntegration(null);
          dismissDeeplink();
        }}
        onConnectingClose={() => {
          setConnectingIntegration(null);
          dismissDeeplink();
        }}
        onConnectingSuccess={() => {
          dismissDeeplink();
          queryClient.invalidateQueries({
            queryKey: dashboardOrpc.integrations.mcp.storeList.queryKey({
              input: { organizationId },
            }),
          });
        }}
        onManagingClose={() => {
          setManagingIntegrationId(null);
          dismissDeeplink();
        }}
        organizationId={organizationId}
      />
    </section>
  );
}
