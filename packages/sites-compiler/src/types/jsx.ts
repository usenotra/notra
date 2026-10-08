import type { SiteDiagnostic } from "@notra/sites-core/types/build";

export interface JsxSnippetAnalysis {
  diagnostics: SiteDiagnostic[];
  exportedNames: string[];
  output: string | null;
}
