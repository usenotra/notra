import type { McpStoreIntegration } from "@/types/integrations/mcp";

export interface StoreIntegrationSelectionInput {
  integrations: McpStoreIntegration[];
  connectSlug?: string;
  dismissedConnectSlug: string | null;
  connectingIntegration: McpStoreIntegration | null;
  confirmingIntegration: McpStoreIntegration | null;
  managingIntegrationId: string | null;
}
