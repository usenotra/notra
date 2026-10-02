import type { HtmlExportTarget } from "@/types/html-to-figma";

type HtmlExportCopy = {
  productName: string;
  buttonLabel: string;
  pendingLabel: string;
  successMessage: string;
  errorMessage: string;
};

export const HTML_EXPORT_LABEL = "Notra HTML import";

export const HTML_HIGHLIGHT_CSS = `
.html-token-tag { color: #116329; }
.html-token-attr { color: #6639ba; }
.html-token-string { color: #0a3069; }
.html-token-punct { color: #6e7781; }
.html-token-comment { color: #6e7781; font-style: italic; }
.dark .html-token-tag { color: #7ee787; }
.dark .html-token-attr { color: #d2a8ff; }
.dark .html-token-string { color: #a5d6ff; }
.dark .html-token-punct { color: #8b949e; }
.dark .html-token-comment { color: #8b949e; }
`;

export const HTML_EXPORT_PLACEHOLDER = `<div style="padding:32px;background:#0f172a;border-radius:16px">
  <h1 style="margin:0;color:#ffffff;font-family:sans-serif;font-size:28px">
    Paste your HTML here
  </h1>
  <p style="margin:8px 0 0;color:#94a3b8;font-family:sans-serif">
    Then copy it as editable layers.
  </p>
</div>`;

export const HTML_EXPORT_COPY: Record<HtmlExportTarget, HtmlExportCopy> = {
  figma: {
    productName: "Figma",
    buttonLabel: "Copy to Figma",
    pendingLabel: "Copying for Figma…",
    successMessage: "Copied for Figma. Paste it into your Figma file.",
    errorMessage: "Could not convert the HTML for Figma.",
  },
  paper: {
    productName: "Paper",
    buttonLabel: "Copy to Paper",
    pendingLabel: "Copying for Paper…",
    successMessage: "Copied for Paper. Paste it into your Paper file.",
    errorMessage: "Could not convert the HTML for Paper.",
  },
};

export const SVG_FILTER_PRIMITIVES = [
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
