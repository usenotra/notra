import type { SiteValidationResult } from "@notra/sites-compiler/types/validate";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";

export interface SiteSourceFile {
  path: string;
  size: number;
}

export interface CollectedSource {
  files: SiteSourceFile[];
  totalBytes: number;
  diagnostics: SiteDiagnostic[];
}

export interface SiteFiles {
  collected: CollectedSource;
  files: Map<string, string | null>;
}

export interface PrepareSiteParams {
  siteRoot: string;
  workDir: string;
  stableAssetNames?: boolean;
}

export interface PreparedSite {
  validation: SiteValidationResult;
  collectDiagnostics: SiteDiagnostic[];
  publicFiles: string[];
  customScripts: string[];
}

export type Inspected =
  | { kind: "skip" }
  | { kind: "diagnostic"; diagnostic: SiteDiagnostic }
  | { kind: "directory"; path: string }
  | { kind: "file"; file: SiteSourceFile };
