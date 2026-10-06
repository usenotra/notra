import { useEffect, useState } from "react";

import { OFFERING_ELAPSED_TICK_MS } from "@/constants/offering-check";

export function useElapsedSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) {
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setSeconds(
        Math.max(
          1,
          Math.round((Date.now() - startedAt) / OFFERING_ELAPSED_TICK_MS)
        )
      );
    }, OFFERING_ELAPSED_TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  return running ? Math.max(1, seconds) : seconds;
}
