"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const getSnapshot = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

const getServerSnapshot = () => false;

export const useClaudeReducedMotion = (override?: boolean): boolean => {
  const prefersReduced = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  return override ?? prefersReduced;
};
