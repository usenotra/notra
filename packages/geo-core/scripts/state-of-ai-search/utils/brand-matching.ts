import type { ReportBrand } from "../categories";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function brandMatchers(brand: ReportBrand): RegExp[] {
  const flags = brand.caseSensitive ? "gu" : "giu";
  return [brand.name, ...(brand.aliases ?? [])].map(
    (name) =>
      new RegExp(
        `(?<![\\p{L}\\p{M}\\p{N}])${escapeRegex(name)}(?![\\p{L}\\p{M}\\p{N}])`,
        flags
      )
  );
}

/** Index of the brand's first mention, or -1. */
export function firstMention(text: string, matchers: RegExp[]): number {
  let first = -1;
  for (const matcher of matchers) {
    matcher.lastIndex = 0;
    const match = matcher.exec(text);
    if (match && (first === -1 || match.index < first)) {
      first = match.index;
    }
  }
  return first;
}
