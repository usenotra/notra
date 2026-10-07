import { Navigate, useLocation } from "@tanstack/react-router";

import type { DashboardSessionState } from "@/types/auth/session";
import { buildSignedOutLandingHref } from "@/utils/signed-out-landing";

export function SignedOutLandingRedirect({
  isAuthenticated,
  isResolved,
}: DashboardSessionState) {
  const location = useLocation();

  if (
    isResolved &&
    !isAuthenticated &&
    (location.pathname === "/home" || location.pathname === "/landing")
  ) {
    return (
      <Navigate
        href={buildSignedOutLandingHref(location.searchStr, location.hash)}
        replace
        to="/"
      />
    );
  }

  return null;
}
