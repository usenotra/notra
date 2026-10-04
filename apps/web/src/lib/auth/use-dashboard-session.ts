import { useEffect, useState } from "react";

import type { DashboardSessionState } from "@/types/auth/session";
import { getNavbarSession } from "@/utils/navbar-session";

export function useDashboardSession(): DashboardSessionState {
  const [state, setState] = useState<DashboardSessionState>({
    isAuthenticated: false,
    isResolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    getNavbarSession().then((isAuthenticated) => {
      if (cancelled) {
        return;
      }
      setState({
        isAuthenticated,
        isResolved: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
