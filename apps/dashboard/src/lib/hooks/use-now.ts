import { useEffect, useState } from "react";

import { DEFAULT_TICK_MS } from "@/constants/time";

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
