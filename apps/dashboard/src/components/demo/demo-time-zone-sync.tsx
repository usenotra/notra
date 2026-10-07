"use client";

import { useEffect } from "react";

import {
  useDemoSandbox,
  useSyncDemoTimeZone,
} from "@/lib/hooks/use-demo-sandbox";

/**
 * Ready-made sandboxes start in the server's time zone; adopt the visitor's
 * so "today" and schedule times follow their clock. Lives apart from the
 * banner so it still runs when the demo is opened with `?banner=off`.
 */
export function DemoTimeZoneSync() {
  const { data: sandbox } = useDemoSandbox(true);
  const { mutate: syncTimeZone } = useSyncDemoTimeZone();
  const sandboxTimeZone = sandbox?.timeZone;

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!sandboxTimeZone || sandboxTimeZone === browserTimeZone) {
      return;
    }
    syncTimeZone(browserTimeZone);
  }, [sandboxTimeZone, syncTimeZone]);

  return null;
}
