export function getNavbarMenuFocusIndex(
  key: string,
  index: number,
  count: number
): number | undefined {
  if (count === 0) {
    return undefined;
  }
  switch (key) {
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
}
