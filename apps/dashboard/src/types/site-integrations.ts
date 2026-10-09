import type { SiteIntegrationName } from "@notra/sites-core/types/site-integrations";
import type { ComponentType, SVGProps } from "react";

export type { SiteIntegrationName };

interface SiteIntegrationField {
  key: string;
  placeholder?: string;
  optional?: boolean;
  type?: "text" | "boolean";
  defaultValue?: boolean;
}

export interface SiteIntegrationProvider {
  id: SiteIntegrationName;
  name: string;
  logo: ComponentType<SVGProps<SVGSVGElement>> | null;
  docsUrl: string;
  fields: readonly SiteIntegrationField[];
}

export type SiteIntegrationValues = Record<string, string | boolean>;
