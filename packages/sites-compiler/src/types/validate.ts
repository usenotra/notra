import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { SiteConfig } from "@notra/sites-core/types/site-config";

import type { SiteEntry } from "./entries";

export interface SiteValidationInput {
  files: ReadonlyMap<string, string | null>;
  defaultConfig?: SiteConfig;
}

export interface SiteValidationResult {
  diagnostics: SiteDiagnostic[];
  config: SiteConfig | null;
  entries: SiteEntry[];
  outputs: Map<string, string>;
  ok: boolean;
}

export interface EntryCandidate {
  area: SiteEntry["area"];
  slug: string;
  format: SiteEntry["format"];
}

export interface ParsedSiteConfig {
  config: SiteConfig | null;
  diagnostics: SiteDiagnostic[];
}

export interface SubstitutedSources {
  sources: Map<string, string | null>;
  diagnostics: SiteDiagnostic[];
}

export interface ImportCycleFrame {
  path: string;
  imports: readonly string[];
  index: number;
}
