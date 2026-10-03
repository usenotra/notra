"use client";

import { useSyncExternalStore } from "react";

import { OPENCODE_REDUCED_MOTION_QUERY } from "../constants/opencode";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(OPENCODE_REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const readPreference = () =>
  window.matchMedia(OPENCODE_REDUCED_MOTION_QUERY).matches;

const readServerPreference = () => false;

/** The user's reduced-motion preference, unless `override` is set. */
export const useOpencodeReducedMotion = (override?: boolean): boolean => {
  const prefersReduced = useSyncExternalStore(
    subscribe,
    readPreference,
    readServerPreference
  );
  return override ?? prefersReduced;
};
