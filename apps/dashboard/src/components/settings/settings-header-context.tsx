"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import type { SettingsHeaderContextValue } from "@/types/settings/modal";

const SettingsHeaderContext = createContext<SettingsHeaderContextValue | null>(
  null
);

export function SettingsHeaderProvider({ children }: { children: ReactNode }) {
  const [titleAccessory, setTitleAccessory] = useState<ReactNode>(null);
  const value = useMemo(
    () => ({ titleAccessory, setTitleAccessory }),
    [titleAccessory]
  );

  return (
    <SettingsHeaderContext.Provider value={value}>
      {children}
    </SettingsHeaderContext.Provider>
  );
}

export function useSettingsHeader(): SettingsHeaderContextValue {
  const context = useContext(SettingsHeaderContext);
  if (!context) {
    throw new Error(
      "useSettingsHeader must be used within SettingsHeaderProvider"
    );
  }
  return context;
}

export function useSettingsHeaderOptional(): SettingsHeaderContextValue | null {
  return useContext(SettingsHeaderContext);
}
