import type { IntegrationType } from "@notra/schemas/dashboard/integrations";

export interface IntegrationConfig {
  id: IntegrationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  href: string;
  available: boolean;
  category: "input" | "output" | "extension";
  connectLabel?: string;
}

export interface IntegrationsPageClientProps {
  organizationSlug: string;
  connectSlug?: string;
}
