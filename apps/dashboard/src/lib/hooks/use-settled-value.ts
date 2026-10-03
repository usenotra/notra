import { useEffect, useRef, useState } from "react";

/**
 * Returns `value`, but only after it stopped changing for `settleMs` and the
 * previously shown value was visible for at least `minVisibleMs`. Rapid
 * flip-flops (e.g. tool done → thinking → next tool) never reach the screen.
 */
export function useSettledValue<T>(
  value: T,
  { settleMs, minVisibleMs }: { settleMs: number; minVisibleMs: number }
): T {
  const [settled, setSettled] = useState(value);
  const shownAtRef = useRef(0);

  useEffect(() => {
    shownAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (Object.is(value, settled)) {
      return;
    }
    const visibleFor = Date.now() - shownAtRef.current;
    const delay = Math.max(settleMs, minVisibleMs - visibleFor);
    const timer = window.setTimeout(() => {
      shownAtRef.current = Date.now();
      setSettled(value);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [minVisibleMs, settleMs, settled, value]);

  return settled;
}
