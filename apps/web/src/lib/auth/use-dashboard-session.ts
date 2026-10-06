import { useCallback, useRef, useSyncExternalStore } from "react";

import type { DashboardSessionState } from "@/types/auth/session";
import { getNavbarSession } from "@/utils/navbar-session";

function getServerSnapshot() {
  return undefined;
}

export function useDashboardSession(): DashboardSessionState {
  const fallback = useRef<boolean | undefined>(undefined);
  const subscribe = useCallback((onChange: () => void) => {
    let cancelled = false;
    getNavbarSession().then((isAuthenticated) => {
      if (!cancelled) {
        fallback.current = isAuthenticated;
        onChange();
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const getSnapshot = useCallback(
    () =>
      window.__notraNavbarSession
        ? window.__notraNavbarSessionResolved
        : fallback.current,
    []
  );
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
