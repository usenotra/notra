"use client";

import { useEffect } from "react";

import { useDemoSandbox } from "@/lib/hooks/use-demo-sandbox";

/**
 * Ready-made sandboxes start in the server's time zone; adopt the visitor's
 * so "today" and schedule times follow their clock. Lives apart from the
 * banner so it still runs when the demo is opened with `?banner=off`.
 */
export function DemoTimeZoneSync() {
  const { data: sandbox } = useDemoSandbox(true);
  const sandboxTimeZone = sandbox?.timeZone;

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!sandboxTimeZone || sandboxTimeZone === browserTimeZone) {
      return;
    }
    void fetch("/api/demo/sandbox/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone: browserTimeZone }),
    }).catch(() => undefined);
  }, [sandboxTimeZone]);

  return null;
}
