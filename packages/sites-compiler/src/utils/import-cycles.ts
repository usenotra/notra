import type { SiteDiagnostic } from "@notra/sites-core/types/build";

export function importCycleDiagnostics(
  paths: readonly string[],
  importsOf: (path: string) => readonly string[]
): SiteDiagnostic[] {
  const diagnostics: SiteDiagnostic[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();
  const reportedCycles = new Set<string>();
  const walk = (path: string, trail: string[]) => {
    if (done.has(path)) {
      return;
    }
    if (visiting.has(path)) {
      const cycle = [...trail.slice(trail.indexOf(path)), path].join(" → ");
      if (!reportedCycles.has(cycle)) {
        reportedCycles.add(cycle);
        diagnostics.push({
          severity: "error",
          file: path,
          code: "import_cycle",
          message: `Import cycle: ${cycle}`,
        });
      }
      return;
    }
    visiting.add(path);
    for (const next of importsOf(path)) {
      walk(next, [...trail, path]);
    }
    visiting.delete(path);
    done.add(path);
  };
  for (const path of paths) {
    walk(path, []);
  }
  return diagnostics;
}
