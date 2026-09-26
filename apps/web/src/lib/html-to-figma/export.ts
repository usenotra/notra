import { copyAsFigma } from "@notra/kiwi";
import { copyAsPaper } from "@notra/kiwi/paper";

import { toSafeHtml } from "@/lib/html-to-figma/sanitize";
import type { HtmlExportResult } from "@/types/html-to-figma";

const EXPORT_WIDTH = "1200px";
const EXPORT_HEIGHT = "630px";
const FONT_RENDER_DELAY_MS = 50;

function createExportElement(html: string): HTMLDivElement {
  // The export is rendered inside this page, so it would pick up the page's
  // cascade: inherited properties (text color, color-scheme, fonts) and any
  // global selector that matches the snippet's descendants. A shadow root stops
  // the selectors, `all: initial` on the host stops the inheritance, and Kiwi
  // then exports the same computed styles a fresh document would produce.
  const host = document.createElement("div");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.pointerEvents = "none";

  const container = document.createElement("div");
  container.style.width = EXPORT_WIDTH;
  container.style.height = EXPORT_HEIGHT;
  container.style.overflow = "visible";
  container.style.display = "flex";
  container.style.background = "#ffffff";

  const range = document.createRange();
  container.replaceChildren(range.createContextualFragment(toSafeHtml(html)));
  host.attachShadow({ mode: "open" }).appendChild(container);
  document.body.appendChild(host);

  return container;
}

async function waitForFonts(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, FONT_RENDER_DELAY_MS);
  });
}

async function copyHtml(
  html: string,
  copy: (element: HTMLElement) => Promise<void>
): Promise<HtmlExportResult> {
  const trimmed = html.trim();

  if (!trimmed) {
    return { copied: false, error: "Paste some HTML first." };
  }

  const exportElement = createExportElement(trimmed);

  try {
    await waitForFonts();
    await copy(exportElement);
    return { copied: true };
  } catch (error) {
    return {
      copied: false,
      error:
        error instanceof Error ? error.message : "Could not convert the HTML.",
    };
  } finally {
    const root = exportElement.getRootNode();
    (root instanceof ShadowRoot ? root.host : exportElement).remove();
  }
}

export function copyHtmlAsFigma(
  html: string,
  label: string
): Promise<HtmlExportResult> {
  return copyHtml(html, (element) =>
    copyAsFigma(element, { label, name: label })
  );
}

export function copyHtmlAsPaper(
  html: string,
  _label: string
): Promise<HtmlExportResult> {
  return copyHtml(html, (element) => copyAsPaper(element));
}
