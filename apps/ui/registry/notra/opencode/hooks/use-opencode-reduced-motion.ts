"use client";

import { useSyncExternalStore } from "react";

import { OPENCODE_REDUCED_MOTION_QUERY } from "../constants/opencode";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(OPENCODE_REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const getSnapshot = () =>
  window.matchMedia(OPENCODE_REDUCED_MOTION_QUERY).matches;

const getServerSnapshot = () => false;

export const useOpencodeReducedMotion = (override?: boolean): boolean => {
  const prefersReduced = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  return override ?? prefersReduced;
};
