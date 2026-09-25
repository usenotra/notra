"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

import type { CommandPaletteOpenSource } from "@/types/analytics/studio-events";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  openSourceRef: React.RefObject<CommandPaletteOpenSource | null>;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openSourceRef = useRef<CommandPaletteOpenSource | null>(null);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useHotkeys(
    "mod+k",
    (event) => {
      if (
        !open &&
        document.querySelector('[role="dialog"][data-state="open"]')
      ) {
        return;
      }
      event.preventDefault();
      if (!open) {
        openSourceRef.current = "hotkey";
      }
      setOpen(!open);
    },
    { enableOnFormTags: true, enableOnContentEditable: true }
  );

  useEffect(() => {
    if (!open) {
      openSourceRef.current = null;
    }
  }, [open]);

  const value = useMemo(
    () => ({ open, setOpen, toggle, openSourceRef }),
    [open, toggle]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider"
    );
  }
  return context;
}
