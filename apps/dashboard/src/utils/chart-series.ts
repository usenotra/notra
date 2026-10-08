/** Indices whose value exists but whose neighbours are both gaps, so no line segment draws them. */
export function isolatedPointIndices(
  values: readonly (number | null)[]
): number[] {
  const indices: number[] = [];
  for (const [index, value] of values.entries()) {
    if (value === null) {
      continue;
    }
    const previous = index === 0 ? null : (values[index - 1] ?? null);
    const next = values[index + 1] ?? null;
    if (previous === null && next === null) {
      indices.push(index);
    }
  }
  return indices;
}
