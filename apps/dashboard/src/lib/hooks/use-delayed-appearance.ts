import { useEffect, useState } from "react";

/**
 * Shows `active` only after it held for `delayMs`, unless `immediate` is set.
 * Once shown it stays shown until `active` turns false, so switching from an
 * immediate to a delayed reason never hides it for a moment.
 */
export function useDelayedAppearance(
  active: boolean,
  { delayMs, immediate }: { delayMs: number; immediate: boolean }
): boolean {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsShown(false);
      return;
    }
    if (immediate) {
      setIsShown(true);
      return;
    }
    const timer = window.setTimeout(() => setIsShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs, immediate]);

  return active && (immediate || isShown);
}
