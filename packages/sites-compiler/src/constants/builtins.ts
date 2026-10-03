/** Components every MDX file can use without importing them (Mintlify-style globals). */
export const BUILTIN_COMPONENTS = [
  "Note",
  "Tip",
  "Info",
  "Warning",
  "Check",
  "Danger",
  "Callout",
  "Card",
  "CardGroup",
  "Columns",
  "Tabs",
  "Tab",
  "Accordion",
  "AccordionGroup",
  "Steps",
  "Step",
  "CodeGroup",
  "Frame",
  "Badge",
  "Update",
  "Video",
  "YouTube",
] as const;

export const BUILTINS_IMPORT_SOURCE = "@notra/builtins";
export const SITE_IMPORT_ALIAS = "@site";
export const INLINE_MODULE_SUFFIX = ".notra-inline.jsx";

/** Identifiers the browser or React provide; never rewritten to `props.x` in snippets. */
export const KNOWN_GLOBALS = new Set([
  "props",
  "Math",
  "Date",
  "JSON",
  "Number",
  "String",
  "Boolean",
  "Array",
  "Object",
  "Intl",
  "undefined",
  "NaN",
  "Infinity",
  "console",
  "window",
  "document",
  "navigator",
  "frontmatter",
]);
