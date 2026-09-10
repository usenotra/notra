export function suggestionPageSlice<T>(
  items: T[],
  page: number,
  visibleCount: number
): T[] {
  if (items.length === 0 || visibleCount <= 0) {
    return items;
  }

  if (items.length <= visibleCount) {
    return items;
  }

  const startIndex =
    (((page * visibleCount) % items.length) + items.length) % items.length;
  const pageItems: T[] = [];

  for (let offset = 0; offset < visibleCount; offset++) {
    const item = items[(startIndex + offset) % items.length];
    if (item !== undefined) {
      pageItems.push(item);
    }
  }

  return pageItems;
}
