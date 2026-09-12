"use client";

import { useSyncExternalStore } from "react";

import {
  isImageExportCopyReady,
  subscribeImageExportCopyReady,
} from "@/lib/content/image-export";
import type { ImageExportTarget } from "@/types/content/image-export";

export function useImageExportCopyReady(
  target: ImageExportTarget,
  enabled = true
): boolean {
  return useSyncExternalStore(
    subscribeImageExportCopyReady,
    () => (enabled ? isImageExportCopyReady(target) : false),
    () => false
  );
}
