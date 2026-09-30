"use client";

import { createContext } from "react";

import type { DemoPlaygroundTab } from "@/types/demo";

export interface DemoPlaygroundContextValue {
  openPlayground: (tab?: DemoPlaygroundTab) => void;
}

export const DemoPlaygroundContext =
  createContext<DemoPlaygroundContextValue | null>(null);
