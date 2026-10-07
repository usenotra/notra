import { toast } from "sonner";

import { EXCALIDRAW_CLIPBOARD_TYPE } from "@/constants/image-export";
import type {
  DiagramExportTarget,
  ImageExportTarget,
} from "@/types/content/image-export";
import {
  buildImageDownloadFilename,
  downloadBlob,
  sanitizeDownloadFilename,
} from "@/utils/download";
import { isDiagramExportTarget } from "@/utils/image-export";
import { sanitizeExportHtml } from "@/utils/sanitize-export-html";
import {
  commonLabelToastMessage,
  imageExportToastMessage,
} from "@/utils/toast-message";

type CopyAsFigma = (typeof import("@notra/kiwi"))["copyAsFigma"];
type CopyAsPaper = (typeof import("@notra/kiwi/paper"))["copyAsPaper"];
type CopyAsFigmaImport = () => Promise<CopyAsFigma>;
type CopyAsPaperImport = () => Promise<CopyAsPaper>;

const importCopyAsFigma: CopyAsFigmaImport = async () => {
  const kiwi = await import("@notra/kiwi");
  // Inter (~1.17 MB) is a nested dynamic import. Warm it here so copy-ready
  // means the click path will not wait on the font before clipboard.write.
  await kiwi.loadFallbackFont();
  return kiwi.copyAsFigma;
};
const importCopyAsPaper: CopyAsPaperImport = () =>
  import("@notra/kiwi/paper").then((module) => module.copyAsPaper);

// Kiwi (Figma/Paper paste + Inter payload) stays off `/content/[id]` initial JS.
let copyAsFigmaPromise: Promise<CopyAsFigma> | null = null;
let copyAsPaperPromise: Promise<CopyAsPaper> | null = null;
let copyAsFigmaFn: CopyAsFigma | null = null;
let copyAsPaperFn: CopyAsPaper | null = null;

function loadCopyAsFigma(): Promise<CopyAsFigma> {
  copyAsFigmaPromise ??= importCopyAsFigma()
    .then((copyAsFigma) => {
      copyAsFigmaFn = copyAsFigma;
      return copyAsFigma;
    })
    .catch((error: unknown) => {
      copyAsFigmaPromise = null;
      throw error;
    });
  return copyAsFigmaPromise;
}

function loadCopyAsPaper(): Promise<CopyAsPaper> {
  copyAsPaperPromise ??= importCopyAsPaper()
    .then((copyAsPaper) => {
      copyAsPaperFn = copyAsPaper;
      return copyAsPaper;
    })
    .catch((error: unknown) => {
      copyAsPaperPromise = null;
      throw error;
    });
  return copyAsPaperPromise;
}

/** True when the Figma/Paper chunk is already in memory for a click handler. */
export function isImageExportCopyReady(target: ImageExportTarget): boolean {
  if (target === "figma") {
    return copyAsFigmaFn !== null;
  }
  if (target === "paper") {
    return copyAsPaperFn !== null;
  }
  // The scene is fetched inside the click; nothing to preload.
  return isDiagramExportTarget(target);
}

/** Warm the Figma/Paper chunk on hover/focus so click keeps clipboard activation. */
export function preloadImageExportCopy(
  target: ImageExportTarget
): Promise<boolean> {
  if (globalThis.window === undefined) {
    return Promise.resolve(false);
  }
  if (target === "figma") {
    return loadCopyAsFigma()
      .then(() => true)
      .catch(() => false);
  }
  if (target === "paper") {
    return loadCopyAsPaper()
      .then(() => true)
      .catch(() => false);
  }
  return Promise.resolve(isDiagramExportTarget(target));
}

function createExportElement(html: string): HTMLDivElement {
  const host = document.createElement("div");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.pointerEvents = "none";

  const container = document.createElement("div");
  container.style.width = "1200px";
  container.style.height = "630px";
  container.style.overflow = "hidden";
  container.style.display = "block";

  container.replaceChildren(sanitizeExportHtml(html));
  host.attachShadow({ mode: "open" }).appendChild(container);
  document.body.appendChild(host);

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
    const root = exportElement.getRootNode();
    (root instanceof ShadowRoot ? root.host : exportElement).remove();
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
    await preloadImageExportCopy("figma");
    const copyAsFigma = copyAsFigmaFn;
    if (!copyAsFigma) {
      toast.error(imageExportToastMessage("copyLoading"));
      return;
    }
    const copied = await withExportElement(
      element,
      html,
      htmlUrl,
      async (exportElement) => {
        await copyAsFigma(exportElement, { label, name: label });
      }
    );
    if (!copied) {
      toast.error(imageExportToastMessage("imageNotReady"));
      return;
    }
    toast.success(imageExportToastMessage("figmaCopied"));
  } catch (error) {
    console.error("Failed to copy image for Figma", error);
    toast.error(imageExportToastMessage("figmaCopyFailed"));
  }
}

export async function copyImageAsPaper(
  element: HTMLElement | null,
  html?: string | null,
  htmlUrl?: string | null
): Promise<void> {
  try {
    await preloadImageExportCopy("paper");
    const copyAsPaper = copyAsPaperFn;
    if (!copyAsPaper) {
      toast.error(imageExportToastMessage("copyLoading"));
      return;
    }
    const copied = await withExportElement(
      element,
      html,
      htmlUrl,
      async (exportElement) => {
        await copyAsPaper(exportElement);
      }
    );
    if (!copied) {
      toast.error(imageExportToastMessage("imageNotReady"));
      return;
    }
    toast.success(imageExportToastMessage("paperCopied"));
  } catch (error) {
    console.error("Failed to copy image for Paper", error);
    toast.error(imageExportToastMessage("paperCopyFailed"));
  }
}

async function fetchExcalidrawClipboardBlob(sceneUrl: string): Promise<Blob> {
  const response = await fetch(sceneUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Excalidraw scene: ${response.status}`);
  }
  const scene: unknown = await response.json();
  if (
    typeof scene !== "object" ||
    scene === null ||
    !("elements" in scene) ||
    !Array.isArray(scene.elements)
  ) {
    throw new Error("Excalidraw scene has no elements");
  }
  const files = "files" in scene ? scene.files : {};
  // Excalidraw and tldraw both read this shape from text/plain on paste.
  const payload = JSON.stringify({
    type: EXCALIDRAW_CLIPBOARD_TYPE,
    elements: scene.elements,
    files,
  });
  return new Blob([payload], { type: "text/plain" });
}

/** Copies the editable diagram scene so it pastes as native shapes in Excalidraw or tldraw. */
export async function copyDiagramScene(
  sceneUrl: string,
  target: DiagramExportTarget
): Promise<void> {
  try {
    // Hand the clipboard a pending blob so the write starts inside the click
    // and keeps user activation while the scene downloads.
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": fetchExcalidrawClipboardBlob(sceneUrl),
      }),
    ]);
    toast.success(
      imageExportToastMessage(
        target === "excalidraw" ? "excalidrawCopied" : "tldrawCopied"
      )
    );
  } catch (error) {
    console.error(`Failed to copy diagram for ${target}`, error);
    toast.error(imageExportToastMessage("diagramCopyFailed"));
  }
}

export async function downloadImage(
  imageUrl: string | null | undefined,
  label?: string
): Promise<void> {
  if (!imageUrl) {
    toast.error(imageExportToastMessage("imageNotReady"));
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
    toast.success(commonLabelToastMessage("downloadedImage"));
  } catch (error) {
    console.error("Failed to download image", error);
    toast.error(imageExportToastMessage("downloadFailed"));
  }
}
