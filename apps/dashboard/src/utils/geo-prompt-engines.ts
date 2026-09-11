import type { KeyboardEvent } from "react";

const EDITABLE_TARGET_SELECTOR =
  "input, textarea, select, [contenteditable='true']";

export function adjacentPromptEngine(
  engines: readonly string[],
  current: string,
  delta: number
): string {
  if (engines.length === 0) {
    return current;
  }

  const index = engines.indexOf(current);
  const from = index === -1 ? 0 : index;
  const next = (from + delta) % engines.length;
  const wrapped = next < 0 ? next + engines.length : next;
  return engines[wrapped] ?? current;
}

/**
 * Delta for arrow-key engine navigation, or `null` when the event should be
 * left alone (single engine, modifier held, or typing in a field).
 */
export function promptEngineArrowDelta(
  event: KeyboardEvent<HTMLElement>,
  engineCount: number
): number | null {
  if (
    engineCount < 2 ||
    (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return null;
  }

  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest(EDITABLE_TARGET_SELECTOR))
  ) {
    return null;
  }

  return event.key === "ArrowLeft" ? -1 : 1;
}
