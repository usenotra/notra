import { useSyncExternalStore } from "react";

import type { DashboardSessionState } from "@/types/auth/session";
import { getNavbarSession } from "@/utils/navbar-session";

function subscribe(onChange: () => void) {
  let cancelled = false;
  getNavbarSession().then(() => {
    if (!cancelled) {
      onChange();
    }
  });
  return () => {
    cancelled = true;
  };
}

function getSnapshot() {
  return window.__notraNavbarSessionResolved;
}

function getServerSnapshot() {
  return undefined;
}

export function useDashboardSession(): DashboardSessionState {
  const isAuthenticated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return {
    isAuthenticated: isAuthenticated === true,
    isResolved: isAuthenticated !== undefined,
  };
}
