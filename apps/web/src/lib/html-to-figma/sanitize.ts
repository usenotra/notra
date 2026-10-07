import DOMPurify from "dompurify";

import { SVG_FILTER_PRIMITIVES } from "@/lib/html-to-figma/constants";
import { jsxToHtml } from "@/lib/html-to-figma/jsx-to-html";

export function toSafeHtml(input: string): string {
  return DOMPurify.sanitize(jsxToHtml(input), {
    USE_PROFILES: { html: true, svg: true },
    ADD_TAGS: SVG_FILTER_PRIMITIVES,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "base", "form"],
    FORBID_ATTR: ["srcdoc"],
  });
}
