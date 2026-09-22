import type { McpStoreIntegration } from "@/types/integrations/mcp";
import type { StoreIntegrationSelectionInput } from "@/types/integrations/store-selection";

export function resolveStoreIntegrationSelection({
  integrations,
  connectSlug,
  dismissedConnectSlug,
  connectingIntegration,
  confirmingIntegration,
  managingIntegrationId,
}: StoreIntegrationSelectionInput) {
  const deeplinkIntegration =
    connectSlug && dismissedConnectSlug !== connectSlug
      ? (integrations.find(
          (integration) =>
            integration.slug === connectSlug || integration.id === connectSlug
        ) ?? null)
      : null;

  return {
    managing:
      integrations.find(
        (integration) => integration.id === managingIntegrationId
      ) ?? (deeplinkIntegration?.connected ? deeplinkIntegration : null),
    connecting:
      connectingIntegration ??
      (!deeplinkIntegration?.connected &&
      deeplinkIntegration?.authType === "headers"
        ? deeplinkIntegration
        : null),
    confirming:
      confirmingIntegration ??
      (deeplinkIntegration &&
      !deeplinkIntegration.connected &&
      deeplinkIntegration.authType !== "headers"
        ? deeplinkIntegration
        : null),
  };
}

export function isStoreConnectPending(
  integration: McpStoreIntegration,
  connectPublic: { isPending: boolean; variables?: { id: string } },
  beginOAuth: { isPending: boolean; variables?: { id: string } }
) {
  return (
    (connectPublic.isPending &&
      connectPublic.variables?.id === integration.id) ||
    (beginOAuth.isPending && beginOAuth.variables?.id === integration.id)
  );
}
