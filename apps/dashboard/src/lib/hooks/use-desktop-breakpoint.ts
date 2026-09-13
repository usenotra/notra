"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_BREAKPOINT_QUERY = "(min-width: 64rem)";

function subscribeToDesktopBreakpoint(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

const getDesktopBreakpointSnapshot = () =>
  window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches;

const getServerDesktopBreakpointSnapshot = () => false;

export function useDesktopBreakpoint() {
  return useSyncExternalStore(
    subscribeToDesktopBreakpoint,
    getDesktopBreakpointSnapshot,
    getServerDesktopBreakpointSnapshot
  );
}
