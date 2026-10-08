import type { SiteDiagnostic } from "@/types/sites";

export function siteDiagnosticLocation(
  diagnostic: SiteDiagnostic
): string | null {
  if (!diagnostic.file) {
    return null;
  }
  if (diagnostic.line === undefined) {
    return diagnostic.file;
  }
  return diagnostic.column === undefined
    ? `${diagnostic.file}:${diagnostic.line}`
    : `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}`;
}

function siteDiagnosticSeverityRank(diagnostic: SiteDiagnostic): number {
  return diagnostic.severity === "error" ? 0 : 1;
}

/** Errors first; the order within each severity stays as reported. */
export function sortSiteDiagnostics<T extends SiteDiagnostic>(
  diagnostics: readonly T[]
): T[] {
  return diagnostics.toSorted(
    (a, b) => siteDiagnosticSeverityRank(a) - siteDiagnosticSeverityRank(b)
  );
}

export function withDiagnosticKeys<T extends SiteDiagnostic>(
  diagnostics: readonly T[]
): { diagnostic: T; key: string }[] {
  const seen = new Map<string, number>();
  return diagnostics.map((diagnostic) => {
    const signature = [
      diagnostic.file ?? "",
      diagnostic.line ?? "",
      diagnostic.column ?? "",
      diagnostic.code,
      diagnostic.message,
    ].join(":");
    const occurrence = seen.get(signature) ?? 0;
    seen.set(signature, occurrence + 1);
    return { diagnostic, key: `${signature}#${occurrence}` };
  });
}
