import type { TOCItemType } from "fumadocs-core/toc";
import type { TocPosition } from "~types/blog";

import {
  TOC_FALLBACK_X,
  TOC_SCROLL_OFFSET_PX,
  TOC_TRANSITION_INSET,
  TOC_X_BY_DEPTH,
} from "@/lib/blog/constants";

export function getHeadingId(item: TOCItemType) {
  return item.url.startsWith("#") ? item.url.slice(1) : item.url;
}

export function scrollToHeading(id: string) {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  const rect = target.getBoundingClientRect();
  const top = rect.top + window.scrollY - TOC_SCROLL_OFFSET_PX;
  window.scrollTo({ top, behavior: "smooth" });
  if (typeof history !== "undefined") {
    history.replaceState(null, "", `#${id}`);
  }
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (typeof history !== "undefined") {
    history.replaceState(null, "", window.location.pathname);
  }
}

export function buildTocPath(positions: TocPosition[]) {
  if (positions.length === 0) {
    return "";
  }

  const segments = positions.map((position, index) => {
    const x = TOC_X_BY_DEPTH[position.depth] ?? TOC_FALLBACK_X;
    const prev = positions[index - 1];
    const next = positions[index + 1];
    const prevX = prev ? (TOC_X_BY_DEPTH[prev.depth] ?? TOC_FALLBACK_X) : x;
    const nextX = next ? (TOC_X_BY_DEPTH[next.depth] ?? TOC_FALLBACK_X) : x;
    const startY =
      prev && prevX !== x ? position.top + TOC_TRANSITION_INSET : position.top;
    const endY =
      next && nextX !== x
        ? position.top + position.height - TOC_TRANSITION_INSET
        : position.top + position.height;
    return { x, startY, endY };
  });

  const first = segments[0];
  if (!first) {
    return "";
  }

  let d = `M ${first.x} ${first.startY}`;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!segment) {
      continue;
    }
    d += ` L ${segment.x} ${segment.endY}`;
    const next = segments[i + 1];
    if (next) {
      d += ` L ${next.x} ${next.startY}`;
    }
  }

  return d;
}
