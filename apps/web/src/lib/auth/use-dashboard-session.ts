"use client";

import { useEffect, useState } from "react";

import { APP_URL } from "@/utils/urls";

const SESSION_ENDPOINT =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/session"
    : `${APP_URL}/api/session`;
const SESSION_PROBE_TIMEOUT_MS = 4_000;

export interface DashboardSessionState {
  isAuthenticated: boolean;
  isResolved: boolean;
}

export function useDashboardSession(): DashboardSessionState {
  const [state, setState] = useState<DashboardSessionState>({
    isAuthenticated: false,
    isResolved: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, SESSION_PROBE_TIMEOUT_MS);

    fetch(SESSION_ENDPOINT, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) {
          return;
        }
        setState({
          isAuthenticated: Boolean(data),
          isResolved: true,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setState({
          isAuthenticated: false,
          isResolved: true,
        });
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return state;
}
