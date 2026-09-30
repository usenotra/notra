import { formatEngineFamily } from "@/utils/geo-charts";

export function scanPreflightEngineNames(engines: readonly string[]): string[] {
  return [...new Set(engines.map((engine) => formatEngineFamily(engine)))];
}

/** `undefined` means run every tracked engine. Empty selection is not a payload. */
export function scanPreflightEnginesToSubmit(
  tracked: readonly string[],
  selected: ReadonlySet<string>
): string[] | undefined {
  const engines = tracked.filter((engine) => selected.has(engine));
  if (engines.length === 0 || engines.length === tracked.length) {
    return undefined;
  }
  return engines;
}
