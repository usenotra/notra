"use client";

import { useEffect, useState } from "react";

export function useDeferredMount() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleCallbackId = window.requestIdleCallback(() => setReady(true), {
        timeout: 1500,
      });
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(timeoutId);
  }, []);

  return ready;
}
