"use client";

import { createContext, useContext } from "react";

import type { SiteContextValue } from "@/types/sites";

export const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) {
    throw new Error("useSite must be used inside the site layout");
  }
  return value;
}
