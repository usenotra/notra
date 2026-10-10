import { OFFERING_WHITESPACE_RUN } from "@/constants/offering-check";

/** The judge sometimes repeats an offering with different casing or spacing. */
export function uniqueOfferings(offerings: readonly string[]): string[] {
  const seen = new Set<string>();
  return offerings.flatMap((offering) => {
    const name = offering.trim();
    const key = name.replace(OFFERING_WHITESPACE_RUN, " ").toLowerCase();
    if (!name || seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [name];
  });
}
