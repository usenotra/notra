export const DOCUMENT_DIFF_FALLBACK_FILENAME = "document.md";

export const DOCUMENT_DIFF_FRAME_CLASSNAME =
  "chat-document-diff border-border bg-background mt-3 max-h-80 overflow-auto rounded-lg border text-xs";

export const CHAT_DOCUMENT_DIFF_UNSAFE_CSS = `
[data-diffs-header="default"] {
  min-height: 2.25rem;
  padding-inline: 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}
[data-change-icon] {
  display: none;
}
[data-header-content] [data-title] {
  color: var(--foreground);
  font-weight: 500;
}
[data-diffs-header="default"] [data-additions-count],
[data-diffs-header="default"] [data-deletions-count] {
  font-size: 0.75rem;
  font-weight: 500;
}
`.trim();

export const CHAT_DOCUMENT_DIFF_OPTIONS = {
  theme: { dark: "one-dark-pro", light: "one-light" },
  diffStyle: "unified",
  overflow: "wrap",
  hunkSeparators: "line-info-basic",
  diffIndicators: "classic",
  unsafeCSS: CHAT_DOCUMENT_DIFF_UNSAFE_CSS,
} as const;
