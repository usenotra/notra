"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  isImageExportCopyReady,
  preloadImageExportCopy,
  subscribeImageExportCopyReady,
} from "@/lib/content/image-export";
import type { ImageExportTarget } from "@/types/content/image-export";

export function useImageExportCopyReady(
  target: ImageExportTarget,
  enabled = true
): boolean {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    const load = () => {
      void preloadImageExportCopy(target).then((ready) => {
        if (cancelled || ready) {
          return;
        }
        timeoutId = globalThis.window.setTimeout(load, 1000);
      });
    };
    load();

    return () => {
      cancelled = true;
      globalThis.window.clearTimeout(timeoutId);
    };
  }, [enabled, target]);

  return useSyncExternalStore(
    subscribeImageExportCopyReady,
    () => (enabled ? isImageExportCopyReady(target) : false),
    () => false
  );
}
