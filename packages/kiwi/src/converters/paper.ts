import type { BuildPaperPasteHtmlOptions } from "../types/paper";

export type { BuildPaperPasteHtmlOptions } from "../types/paper";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function isWhitespaceText(node: ChildNode): boolean {
  return (
    node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() === ""
  );
}

function paperRootElement(
  element: HTMLElement,
  unwrapSingleChild: boolean
): HTMLElement {
  if (!unwrapSingleChild) {
    return element;
  }

  const meaningfulChildren = Array.from(element.childNodes).filter(
    (node) => !isWhitespaceText(node) && node.nodeType !== Node.COMMENT_NODE
  );
  const onlyChild = meaningfulChildren[0];

  if (meaningfulChildren.length === 1 && onlyChild instanceof HTMLElement) {
    return onlyChild;
  }

  return element;
}

// Paper reads pasted SVG markup (text/plain or image/svg+xml) with its own
// vector importer, which resolves paint, clipPath, mask and gradient servers
// from the markup itself, and pasted HTML when text/plain looks like markup.
// Both arrive through plain text, which the clipboard does not rewrite, so
// neither goes through the "paper-temp-tree" payload that is inserted verbatim
// with no style or vector resolution (that one renders SVG as fill=none).
function soleSvgChild(element: Element): SVGSVGElement | null {
  if (element.namespaceURI === SVG_NAMESPACE) {
    return element as SVGSVGElement;
  }

  const children = Array.from(element.children);
  const only = children.length === 1 ? children[0] : null;
  if (!only || only.namespaceURI !== SVG_NAMESPACE) {
    return null;
  }

  // Paper prefers the SVG payload over the HTML one, so only take this route
  // when the SVG is the whole export; otherwise keep the surrounding HTML.
  const hasText = Array.from(element.childNodes).some(
    (node) =>
      node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== ""
  );

  return hasText ? null : (only as SVGSVGElement);
}

export function buildPaperPasteHtml(
  element: HTMLElement,
  options: BuildPaperPasteHtmlOptions = {}
): string {
  return paperRootElement(element, options.unwrapSingleChild ?? true).outerHTML;
}

function supportsClipboardType(type: string): boolean {
  const supports = (
    ClipboardItem as unknown as { supports?: (value: string) => boolean }
  ).supports;
  return supports?.(type) ?? false;
}

export async function copyAsPaper(
  element: HTMLElement,
  options: BuildPaperPasteHtmlOptions = {}
): Promise<void> {
  const root = paperRootElement(element, options.unwrapSingleChild ?? true);
  const svg = soleSvgChild(root);
  // Paper prefers SVG markup over HTML, so text/plain only carries the SVG
  // when the SVG is the whole export; otherwise it carries the HTML.
  const markup = svg
    ? new XMLSerializer().serializeToString(svg)
    : root.outerHTML;
  const payload: Record<string, Blob> = {
    "text/html": new Blob([markup], { type: "text/html" }),
    "text/plain": new Blob([markup], { type: "text/plain" }),
  };

  if (svg && supportsClipboardType("image/svg+xml")) {
    payload["image/svg+xml"] = new Blob([markup], { type: "image/svg+xml" });
  }

  await navigator.clipboard.write([new ClipboardItem(payload)]);
}
