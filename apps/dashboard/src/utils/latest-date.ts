/**
 * The later of two moments. Relative times measured against a `now` captured
 * at mount would otherwise call a just-created item "in 8 seconds".
 */
export function latest(now: Date, value: Date | string | number): Date {
  const date = new Date(value);
  return date > now ? date : now;
}
