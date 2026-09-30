export function countEnabled<T extends { enabled: boolean }>(items: T[]) {
  let active = 0;
  for (const item of items) {
    if (item.enabled) {
      active++;
    }
  }
  return { active, paused: items.length - active };
}
