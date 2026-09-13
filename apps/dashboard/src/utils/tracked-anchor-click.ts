import type {
  ModifiedClickEvent,
  TrackedAnchorClickEvent,
} from "@/types/tracked-anchor-click";

export function isModifiedClick(event: ModifiedClickEvent): boolean {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * Flush analytics, then navigate. Modifier clicks (new tab / window) keep
 * the native `<a>` behavior so we never steal cmd/ctrl/shift/middle-click.
 */
export function handleTrackedAnchorClick(
  event: TrackedAnchorClickEvent,
  track: () => Promise<unknown>
): void {
  if (isModifiedClick(event)) {
    void track();
    return;
  }

  event.preventDefault();
  const href = event.currentTarget.href;
  void track().finally(() => {
    window.location.assign(href);
  });
}
