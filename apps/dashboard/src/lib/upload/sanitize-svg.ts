import "@tanstack/react-start/server-only";
import sanitizeHtml, { type IOptions } from "sanitize-html";

const SVG_ROOT_TAG_REGEX = /<svg[\s>]/i;
const SVG_ROOT_OPEN_TAG_REGEX = /^(\s*<svg\b)([^>]*)(>)/i;
const SVG_XMLNS = 'xmlns="http://www.w3.org/2000/svg"';
const SVG_XLINK_XMLNS = 'xmlns:xlink="http://www.w3.org/1999/xlink"';
const SVG_XMLNS_ATTRIBUTE_REGEX = /\sxmlns=(["'])[^"']*\1/i;
const SVG_XLINK_ATTRIBUTE_REGEX = /\sxlink:href=(["'])[^"']*\1/i;
const SVG_XLINK_XMLNS_ATTRIBUTE_REGEX = /\sxmlns:xlink=(["'])[^"']*\1/i;

export class SvgSanitizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvgSanitizationError";
  }
}

const SVG_SANITIZE_OPTIONS = {
  allowedTags: [
    "a",
    "circle",
    "clipPath",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComposite",
    "feDropShadow",
    "feFlood",
    "feGaussianBlur",
    "feMerge",
    "feMergeNode",
    "feOffset",
    "filter",
    "g",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "stop",
    "svg",
    "symbol",
    "text",
    "textPath",
    "title",
    "tspan",
    "use",
  ],
  allowedAttributes: {
    "*": [
      "alignment-baseline",
      "aria-hidden",
      "aria-label",
      "baseline-shift",
      "class",
      "clip-path",
      "clip-rule",
      "color",
      "color-interpolation-filters",
      "cx",
      "cy",
      "d",
      "dx",
      "dy",
      "fill",
      "fill-opacity",
      "fill-rule",
      "filter",
      "filterUnits",
      "font-family",
      "font-size",
      "font-style",
      "font-weight",
      "gradientTransform",
      "gradientUnits",
      "height",
      "id",
      "mask",
      "maskUnits",
      "offset",
      "opacity",
      "pathLength",
      "patternContentUnits",
      "patternTransform",
      "patternUnits",
      "points",
      "preserveAspectRatio",
      "r",
      "role",
      "rx",
      "ry",
      "spreadMethod",
      "stop-color",
      "stop-opacity",
      "stroke",
      "stroke-dasharray",
      "stroke-dashoffset",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "stroke-opacity",
      "stroke-width",
      "transform",
      "transform-origin",
      "vector-effect",
      "viewBox",
      "width",
      "x",
      "x1",
      "x2",
      "xmlns",
      "xmlns:xlink",
      "y",
      "y1",
      "y2",
    ],
    image: ["href", "xlink:href"],
    use: ["href", "xlink:href"],
  },
  allowedSchemes: ["data"],
  allowedSchemesAppliedToAttributes: ["href", "xlink:href"],
  disallowedTagsMode: "discard",
  parser: {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
  },
} satisfies IOptions;

function ensureRootNamespaces(svg: string) {
  return svg.replace(
    SVG_ROOT_OPEN_TAG_REGEX,
    (match, start: string, attributes: string, end: string) => {
      const namespaces = [
        SVG_XMLNS_ATTRIBUTE_REGEX.test(attributes) ? null : SVG_XMLNS,
        SVG_XLINK_ATTRIBUTE_REGEX.test(svg) &&
        !SVG_XLINK_XMLNS_ATTRIBUTE_REGEX.test(attributes)
          ? SVG_XLINK_XMLNS
          : null,
      ].filter(Boolean);

      if (namespaces.length === 0) {
        return match;
      }

      return `${start} ${namespaces.join(" ")}${attributes}${end}`;
    }
  );
}

export async function sanitizeSvg(input: string): Promise<string> {
  if (!SVG_ROOT_TAG_REGEX.test(input)) {
    throw new SvgSanitizationError("Payload does not contain an <svg> root");
  }

  const sanitized = sanitizeHtml(input, SVG_SANITIZE_OPTIONS);

  if (!SVG_ROOT_TAG_REGEX.test(sanitized)) {
    throw new SvgSanitizationError("SVG is empty after sanitization");
  }

  return ensureRootNamespaces(sanitized);
}
