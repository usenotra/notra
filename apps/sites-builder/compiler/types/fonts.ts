import type { SiteDiagnostic } from "@notra/sites-core/types/build";

export interface SiteFontsResult {
  stylesheet?: string;
  publicFiles: string[];
  diagnostics: SiteDiagnostic[];
}
