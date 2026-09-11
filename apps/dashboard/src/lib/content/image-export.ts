import { toast } from "sonner";

import type { ImageExportTarget } from "@/types/content/image-export";
import {
  buildImageDownloadFilename,
  downloadBlob,
  sanitizeDownloadFilename,
} from "@/utils/download";
import { sanitizeExportHtml } from "@/utils/sanitize-export-html";

type CopyAsFigma = (typeof import("@notra/kiwi"))["copyAsFigma"];
type CopyAsPaper = (typeof import("@notra/kiwi/paper"))["copyAsPaper"];
type CopyAsFigmaImport = () => Promise<CopyAsFigma>;
type CopyAsPaperImport = () => Promise<CopyAsPaper>;

const defaultImportCopyAsFigma: CopyAsFigmaImport = () =>
  import("@notra/kiwi").then((module) => module.copyAsFigma);
const defaultImportCopyAsPaper: CopyAsPaperImport = () =>
  import("@notra/kiwi/paper").then((module) => module.copyAsPaper);

// Kiwi (Figma/Paper paste + Inter payload) stays off `/content/[id]` initial JS.
let importCopyAsFigma = defaultImportCopyAsFigma;
let importCopyAsPaper = defaultImportCopyAsPaper;
let copyAsFigmaPromise: Promise<CopyAsFigma> | null = null;
let copyAsPaperPromise: Promise<CopyAsPaper> | null = null;

function loadCopyAsFigma(): Promise<CopyAsFigma> {
  copyAsFigmaPromise ??= importCopyAsFigma().catch((error: unknown) => {
    copyAsFigmaPromise = null;
    throw error;
  });
  return copyAsFigmaPromise;
}

function loadCopyAsPaper(): Promise<CopyAsPaper> {
  copyAsPaperPromise ??= importCopyAsPaper().catch((error: unknown) => {
    copyAsPaperPromise = null;
    throw error;
  });
  return copyAsPaperPromise;
}

/** Test-only: drop copy caches so a later case can start a fresh import. */
export function resetImageExportCopyForTests(next?: {
  figma?: CopyAsFigmaImport;
  paper?: CopyAsPaperImport;
}): void {
  copyAsFigmaPromise = null;
  copyAsPaperPromise = null;
  importCopyAsFigma = next?.figma ?? defaultImportCopyAsFigma;
  importCopyAsPaper = next?.paper ?? defaultImportCopyAsPaper;
}

/** Warm the Figma/Paper chunk on hover/focus so click keeps clipboard activation. */
export function preloadImageExportCopy(target: ImageExportTarget): void {
  if (globalThis.window === undefined) {
    return;
  }
  if (target === "figma") {
    void loadCopyAsFigma().catch(() => undefined);
    return;
  }
  if (target === "paper") {
    void loadCopyAsPaper().catch(() => undefined);
  }
}

function createExportElement(html: string): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "1200px";
  container.style.height = "630px";
  container.style.overflow = "hidden";
  container.style.pointerEvents = "none";

  container.replaceChildren(sanitizeExportHtml(html));
  document.body.appendChild(container);

  return container;
}

async function withExportElement(
  element: HTMLElement | null,
  html: string | null | undefined,
  htmlUrl: string | null | undefined,
  copy: (element: HTMLElement) => Promise<void>
): Promise<boolean> {
  let exportHtml = html?.trim() ? html : null;

  if (!(exportHtml || htmlUrl?.trim())) {
    if (!element) {
      return false;
    }
    await copy(element);
    return true;
  }

  if (!exportHtml && htmlUrl) {
    const response = await fetch(htmlUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image HTML artifact: ${response.status}`
      );
    }
    exportHtml = await response.text();
  }

  if (!exportHtml?.trim()) {
    return false;
  }

  const exportElement = createExportElement(exportHtml);
  try {
    await copy(exportElement);
  } finally {
    exportElement.remove();
  }
  return true;
}

export async function copyImageAsFigma(
  element: HTMLElement | null,
  label?: string,
  html?: string | null,
  htmlUrl?: string | null
): Promise<void> {
  try {
    const copyFnPromise = loadCopyAsFigma();
    const copied = await withExportElement(
      element,
      html,
      htmlUrl,
      async (exportElement) => {
        const copyAsFigma = await copyFnPromise;
        await copyAsFigma(exportElement, { label, name: label });
      }
    );
    if (!copied) {
      toast.error("Image is not ready yet");
      return;
    }
    toast.success("Copied for Figma. Paste it into your Figma file.");
  } catch (error) {
    console.error("Failed to copy image for Figma", error);
    toast.error("Failed to copy for Figma");
  }
}

export async function copyImageAsPaper(
  element: HTMLElement | null,
  label?: string,
  html?: string | null,
  htmlUrl?: string | null
): Promise<void> {
  try {
    const copyFnPromise = loadCopyAsPaper();
    const copied = await withExportElement(
      element,
      html,
      htmlUrl,
      async (exportElement) => {
        const copyAsPaper = await copyFnPromise;
        await copyAsPaper(exportElement, { label, name: label });
      }
    );
    if (!copied) {
      toast.error("Image is not ready yet");
      return;
    }
    toast.success("Copied for Paper. Paste it into your Paper file.");
  } catch (error) {
    console.error("Failed to copy image for Paper", error);
    toast.error("Failed to copy for Paper");
  }
}

export async function downloadImage(
  imageUrl: string | null | undefined,
  label?: string
): Promise<void> {
  if (!imageUrl) {
    toast.error("Image is not ready yet");
    return;
  }

  const baseName = sanitizeDownloadFilename(label ?? "image") || "image";

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const blob = await response.blob();
    downloadBlob(blob, buildImageDownloadFilename(baseName, blob.type, "png"));
    toast.success("Downloaded image");
  } catch (error) {
    console.error("Failed to download image", error);
    toast.error("Failed to download image");
  }
}
