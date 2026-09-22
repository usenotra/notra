export const DOCUMENT_DIFF_FALLBACK_FILENAME = "document.md";

export const DOCUMENT_DIFF_FRAME_CLASSNAME =
  "border-border bg-muted/20 mt-3 max-h-80 overflow-auto rounded-lg border";

export const CHAT_DOCUMENT_DIFF_OPTIONS = {
  theme: { dark: "pierre-dark", light: "pierre-light" },
  diffStyle: "unified",
  overflow: "wrap",
  hunkSeparators: "line-info-basic",
} as const;
