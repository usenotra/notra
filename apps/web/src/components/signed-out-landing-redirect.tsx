"use client";

import { redirect, usePathname } from "next/navigation";

import type { DashboardSessionState } from "@/lib/auth/use-dashboard-session";

export function SignedOutLandingRedirect({
  isAuthenticated,
  isResolved,
}: DashboardSessionState) {
  const pathname = usePathname();

  if (
    typeof window !== "undefined" &&
    isResolved &&
    !isAuthenticated &&
    (pathname === "/home" || pathname === "/landing")
  ) {
    const destination = new URL(window.location.href);
    destination.searchParams.delete("mode");
    redirect(`/${destination.search}${destination.hash}`);
  }

  return null;
}
