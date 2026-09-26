import {
  SVG_NS,
  SVG_SYMBOL_VIEWPORT_ATTRS,
  SVG_USE_MAX_DEPTH,
  SVG_USE_PLACEMENT_ATTRS,
} from "../constants/dom-to-scene";

function copyAttrs(from: Element, to: Element, names: string[]): void {
  for (const name of names) {
    const value = from.getAttribute(name);
    if (value !== null) {
      to.setAttribute(name, value);
    }
  }
}

function useTarget(useEl: Element): Element | null {
  const href = useEl.getAttribute("href") ?? useEl.getAttribute("xlink:href");
  const id = href?.trim().replace(/^#/, "");
  if (!id) {
    return null;
  }
  // A shadow root is its own id scope, so ownerDocument cannot resolve ids
  // inside it; ask the element's own root first, then fall back to the document.
  const root = useEl.getRootNode() as Partial<Pick<Document, "getElementById">>;
  return (
    root.getElementById?.(id) ?? useEl.ownerDocument.getElementById(id) ?? null
  );
}

function inlineUse(useEl: Element, depth: number): Element | null {
  const target = useTarget(useEl);
  if (!target || depth > SVG_USE_MAX_DEPTH) {
    return null;
  }
  let clone: Element;
  if (target.tagName.toLowerCase() === "symbol") {
    clone = useEl.ownerDocument.createElementNS(SVG_NS, "svg");
    copyAttrs(target, clone, SVG_SYMBOL_VIEWPORT_ATTRS);
    for (const child of target.children) {
      clone.append(child.cloneNode(true));
    }
  } else {
    const copy = target.cloneNode(true);
    if (!(copy instanceof Element)) {
      return null;
    }
    clone = copy;
  }
  copyAttrs(useEl, clone, SVG_USE_PLACEMENT_ATTRS);
  clone.removeAttribute("id");
  for (const nested of clone.querySelectorAll("use")) {
    inlineUse(nested, depth + 1);
  }
  useEl.replaceWith(clone);
  return clone;
}

export function inlineSvgUses(svg: Element): () => void {
  const swaps: [Element, Element][] = [];
  for (const useEl of svg.querySelectorAll("use")) {
    if (useEl.closest("defs, symbol")) {
      continue;
    }
    const clone = inlineUse(useEl, 0);
    if (clone) {
      swaps.push([useEl, clone]);
    }
  }
  return () => {
    for (const [useEl, clone] of swaps) {
      clone.replaceWith(useEl);
    }
  };
}
