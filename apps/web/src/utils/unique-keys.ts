/**
 * React keys for items that have no id and may repeat: the base is the
 * item's content, and repeats get an occurrence suffix.
 */
export function uniqueKeys(bases: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return bases.map((base) => {
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}#${count}`;
  });
}
