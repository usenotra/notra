import type { SiteDiagnostic } from "@notra/sites-core/types/build";

import type { ImportCycleFrame } from "../types/validate";

export function importCycleDiagnostics(
  paths: readonly string[],
  importsOf: (path: string) => readonly string[]
): SiteDiagnostic[] {
  const diagnostics: SiteDiagnostic[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();
  const reportedCycles = new Set<string>();
  const trail: string[] = [];
  const stack: ImportCycleFrame[] = [];
  for (const path of paths) {
    if (done.has(path)) {
      continue;
    }
    visiting.add(path);
    trail.push(path);
    stack.push({ path, imports: importsOf(path), index: 0 });
    while (stack.length > 0) {
      const frame = stack.at(-1);
      if (!frame) {
        break;
      }
      const next = frame.imports[frame.index++];
      if (next === undefined) {
        stack.pop();
        trail.pop();
        visiting.delete(frame.path);
        done.add(frame.path);
        continue;
      }
      if (done.has(next)) {
        continue;
      }
      if (visiting.has(next)) {
        const cycle = [...trail.slice(trail.indexOf(next)), next].join(" → ");
        if (!reportedCycles.has(cycle)) {
          reportedCycles.add(cycle);
          diagnostics.push({
            severity: "error",
            file: next,
            code: "import_cycle",
            message: `Import cycle: ${cycle}`,
          });
        }
        continue;
      }
      visiting.add(next);
      trail.push(next);
      stack.push({ path: next, imports: importsOf(next), index: 0 });
    }
  }
  return diagnostics;
}
