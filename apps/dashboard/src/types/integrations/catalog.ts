import type { IntegrationType } from "@notra/schemas/dashboard/integrations";

import type messages from "../../../messages/en.json";

export interface IntegrationConfig {
  id: IntegrationType;
  name: string;
  descriptionKey: keyof (typeof messages)["integrations"]["overview"]["catalog"];
  icon: React.ReactNode;
  accentColor: string;
  href: string;
  available: boolean;
  category: "input" | "output" | "extension";
  connectLabelKey?: "setupGuide";
}

export interface IntegrationsPageClientProps {
  organizationSlug: string;
  connectSlug?: string;
}

export interface IntegrationConnectDialogProps {
  integrationId: IntegrationType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationSlug: string;
}
