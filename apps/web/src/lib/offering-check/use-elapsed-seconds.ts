"use client";

import { useEffect, useState } from "react";

const TICK_MS = 1000;

export function useElapsedSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) {
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.round((Date.now() - startedAt) / TICK_MS));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  return seconds;
}
