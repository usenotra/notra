import type { IntegrationConfig } from "@/types/integrations/catalog";

export interface IntegrationsSettingsRowProps {
  connectedCount: number;
  integration: IntegrationConfig;
  onManage: () => void;
}
