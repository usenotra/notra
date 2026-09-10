"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const dismissedKeys = new Set<string>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readDismissed(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return dismissedKeys.has(key);
  }
}

export function useChatSuggestionsDismissal(storageKey: string) {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(storageKey),
    () => false
  );
  const dismiss = () => {
    dismissedKeys.add(storageKey);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Keep dismissal for this page when browser storage is unavailable.
    }
    for (const listener of listeners) {
      listener();
    }
  };
  return { dismissed, dismiss };
}
