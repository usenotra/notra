export function getPageNumbers(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, "ellipsis", total];
  }
  if (current >= total - 3) {
    return [total - 4, total - 3, total - 2, total - 1, total];
  }
  return [current - 1, current, current + 1, "ellipsis", total];
}
