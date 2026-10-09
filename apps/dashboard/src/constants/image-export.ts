export const IMAGE_EXPORT_TARGETS = [
  "paper",
  "figma",
  "excalidraw",
  "tldraw",
  "wonder",
] as const;

/** Targets that paste the editable Excalidraw scene; only diagram images have one. */
export const DIAGRAM_EXPORT_TARGETS = ["excalidraw", "tldraw"] as const;

export const EXCALIDRAW_CLIPBOARD_TYPE = "excalidraw/clipboard";

export const IMAGE_EXPORT_TARGET_LABELS: Record<
  (typeof IMAGE_EXPORT_TARGETS)[number],
  string
> = {
  paper: "Paper",
  figma: "Figma",
  excalidraw: "Excalidraw",
  tldraw: "tldraw",
  wonder: "Wonder",
};

export const EXPORT_HTML_FORBIDDEN_TAGS = [
  "script",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "base",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "animate",
  "animateMotion",
  "animateTransform",
  "set",
  "handler",
  "foreignObject",
];

export const EXPORT_HTML_FORBIDDEN_ATTRIBUTES = [
  "attributeName",
  "attributename",
  "values",
  "from",
  "to",
  "by",
  "begin",
  "ping",
];

export const EXPORT_HTML_DATA_URI_TAGS = ["img", "image"];

export const EXPORT_HTML_IMAGE_URL_ATTRIBUTES = ["src", "href", "xlink:href"];

export const EXPORT_HTML_SAFE_DATA_URL_REGEX =
  /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);/i;

export const EXPORT_HTML_DATA_URL_PREFIX = "data:";
