import { useSyncExternalStore } from "react";

let pageLoadedAt: number | null = null;

function loadedAt(): number {
  pageLoadedAt ??= Date.now();
  return pageLoadedAt;
}

function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): number {
  return loadedAt();
}

function getServerSnapshot(): null {
  return null;
}

export function usePageClockBase(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function pageClockElapsedMs(): number {
  return Date.now() - loadedAt();
}
