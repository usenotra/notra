import { SVG_NS } from "../constants/dom-to-scene";
import type { BuildPaperPasteHtmlOptions } from "../types/paper";

export type { BuildPaperPasteHtmlOptions } from "../types/paper";

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

function soleSvgChild(element: HTMLElement): Element | null {
  const [only] = element.children;
  const hasText = Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && !isWhitespaceText(node)
  );
  return element.children.length === 1 &&
    only?.namespaceURI === SVG_NS &&
    only.localName === "svg" &&
    !hasText
    ? only
    : null;
}

export function buildPaperPasteHtml(
  element: HTMLElement,
  options: BuildPaperPasteHtmlOptions = {}
): string {
  return paperRootElement(element, options.unwrapSingleChild ?? true).outerHTML;
}

export async function copyAsPaper(
  element: HTMLElement,
  options: BuildPaperPasteHtmlOptions = {}
): Promise<void> {
  const root = paperRootElement(element, options.unwrapSingleChild ?? true);
  const svg = soleSvgChild(root);
  const markup = svg
    ? new XMLSerializer().serializeToString(svg)
    : root.outerHTML;
  const payload: Record<string, Blob> = {
    "text/html": new Blob([markup], { type: "text/html" }),
    "text/plain": new Blob([markup], { type: "text/plain" }),
  };

  if (
    svg &&
    "supports" in ClipboardItem &&
    ClipboardItem.supports("image/svg+xml")
  ) {
    payload["image/svg+xml"] = new Blob([markup], { type: "image/svg+xml" });
  }

  await navigator.clipboard.write([new ClipboardItem(payload)]);
}
