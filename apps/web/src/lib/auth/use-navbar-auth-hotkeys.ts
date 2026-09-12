"use client";

import { useHotkey } from "@tanstack/react-hotkeys";

import {
  AUTH_APP_HOTKEY,
  AUTH_DASHBOARD_URL,
  AUTH_SIGNIN_HOTKEY,
  AUTH_SIGNIN_URL,
} from "@/constants/auth";
import { NAVBAR_HOTKEY_SIGNUP_SOURCE } from "@/constants/navbar";
import type { DashboardSessionState } from "@/lib/auth/use-dashboard-session";
import { startSignup } from "@/utils/signup";

export function useNavbarAuthHotkeys({
  isAuthenticated,
  isResolved,
}: DashboardSessionState): void {
  useHotkey(
    AUTH_SIGNIN_HOTKEY,
    (event) => {
      event.preventDefault();
      window.location.assign(AUTH_SIGNIN_URL);
    },
    { enabled: isResolved && !isAuthenticated }
  );

  useHotkey(
    AUTH_APP_HOTKEY,
    (event) => {
      event.preventDefault();
      if (isAuthenticated) {
        window.location.assign(AUTH_DASHBOARD_URL);
        return;
      }
      startSignup(NAVBAR_HOTKEY_SIGNUP_SOURCE);
    },
    { enabled: isResolved }
  );
}
