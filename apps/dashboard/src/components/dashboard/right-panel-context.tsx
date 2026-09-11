"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useRightPanelState } from "@/lib/hooks/use-right-panel-state";
import type { RightPanelContextValue } from "@/types/components/right-panel";

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const value = useRightPanelState();

  return (
    <RightPanelContext.Provider value={value}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (!context) {
    throw new Error("useRightPanel must be used within a RightPanelProvider");
  }
  return context;
}
