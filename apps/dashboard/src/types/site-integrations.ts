import type { SiteIntegrationName } from "@notra/sites-server/types/integrations";
import type { ComponentType, SVGProps } from "react";

export type { SiteIntegrationName };

interface SiteIntegrationField {
  key: string;
  placeholder?: string;
  optional?: boolean;
}

export interface SiteIntegrationProvider {
  id: SiteIntegrationName;
  name: string;
  logo: ComponentType<SVGProps<SVGSVGElement>> | null;
  docsUrl: string;
  fields: readonly SiteIntegrationField[];
}

export type SiteIntegrationValues = Record<string, string>;
