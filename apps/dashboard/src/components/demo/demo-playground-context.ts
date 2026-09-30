"use client";

import { createContext, useContext } from "react";

import type { DemoPlaygroundTab } from "@/types/demo";

export interface DemoPlaygroundContextValue {
  openPlayground: (tab?: DemoPlaygroundTab) => void;
}

export const DemoPlaygroundContext =
  createContext<DemoPlaygroundContextValue | null>(null);

/** Null outside the public demo, so callers can render nothing. */
export function useDemoPlayground() {
  return useContext(DemoPlaygroundContext);
}
