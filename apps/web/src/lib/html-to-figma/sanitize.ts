import DOMPurify from "dompurify";

import { jsxToHtml } from "@/lib/html-to-figma/jsx-to-html";

// SVG filter primitives in lowercase: real HTML parsers lowercase unknown SVG
// tags (feDropShadow is not in the spec's adjustment table), while DOMPurify
// checks tags case-sensitively after lowercasing — so its camelCase
// svgFilters profile never matches and the primitives get stripped,
// silently dropping all SVG filters. Listing them here keeps them.
const SVG_FILTER_PRIMITIVES = [
  "feblend",
  "fecolormatrix",
  "fecomponenttransfer",
  "fecomposite",
  "feconvolvematrix",
  "fediffuselighting",
  "fedisplacementmap",
  "fedistantlight",
  "fedropshadow",
  "feflood",
  "fefunca",
  "fefuncb",
  "fefuncg",
  "fefuncr",
  "fegaussianblur",
  "feimage",
  "femerge",
  "femergenode",
  "femorphology",
  "feoffset",
  "fepointlight",
  "fespecularlighting",
  "fespotlight",
  "fetile",
  "feturbulence",
];

export function toSafeHtml(input: string): string {
  return DOMPurify.sanitize(jsxToHtml(input), {
    USE_PROFILES: { html: true, svg: true },
    ADD_TAGS: SVG_FILTER_PRIMITIVES,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "base", "form"],
    FORBID_ATTR: ["srcdoc"],
  });
}
