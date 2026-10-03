"use client";

import { createContext, useContext } from "react";

import type { SiteDeployment, SiteDetail } from "@/types/sites";

export interface SiteContextValue {
  organizationId: string;
  organizationSlug: string;
  siteId: string;
  detail: SiteDetail;
  liveDeployment: SiteDeployment | null;
}

export const SiteContext = createContext<SiteContextValue | null>(null);

/** The site every page below /sites/[siteId] works on; loaded once by the site layout. */
export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) {
    throw new Error("useSite must be used inside the site layout");
  }
  return value;
}
