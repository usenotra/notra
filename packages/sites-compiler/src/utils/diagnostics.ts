import type { SiteDiagnostic } from "@notra/sites-core/types/build";

export function hasErrors(diagnostics: readonly SiteDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}
