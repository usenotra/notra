import { Navigate, useLocation } from "@tanstack/react-router";

import type { DashboardSessionState } from "@/lib/auth/use-dashboard-session";

export function SignedOutLandingRedirect({
  isAuthenticated,
  isResolved,
}: DashboardSessionState) {
  const pathname = useLocation({ select: (location) => location.pathname });

  if (
    typeof window !== "undefined" &&
    isResolved &&
    !isAuthenticated &&
    (pathname === "/home" || pathname === "/landing")
  ) {
    const destination = new URL(window.location.href);
    destination.searchParams.delete("mode");
    return (
      <Navigate
        href={`/${destination.search}${destination.hash}`}
        replace
        to="/"
      />
    );
  }

  return null;
}
