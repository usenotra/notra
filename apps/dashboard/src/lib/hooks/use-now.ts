import { useEffect, useState } from "react";

const DEFAULT_TICK_MS = 1000;

/** Current time that re-renders every `intervalMs` while `enabled`, for live elapsed timers. */
export function useNow(enabled: boolean, intervalMs = DEFAULT_TICK_MS): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs]);
  return now;
}
