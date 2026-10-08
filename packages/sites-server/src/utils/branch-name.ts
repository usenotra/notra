export function timestampedBranchName(prefix: string, now: Date): string {
  return `${prefix}${now.toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;
}
