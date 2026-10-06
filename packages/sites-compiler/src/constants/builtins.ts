import { SITE_INJECTED_REACT_HOOKS } from "@notra/sites-core/constants/sites";

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
  "ThemeToggle",
  "SiteAreas",
] as const;

export const BUILTIN_COMPONENT_NAMES = new Set<string>(BUILTIN_COMPONENTS);
export const INJECTED_HOOK_NAMES = new Set<string>(SITE_INJECTED_REACT_HOOKS);

export const BUILTINS_IMPORT_SOURCE = "@notra/builtins";
export const SITE_IMPORT_ALIAS = "@site";
export const INLINE_MODULE_SUFFIX = ".notra-inline.jsx";
export const IMPORTABLE_EXTENSIONS = [".mdx", ".md", ".jsx", ".js"] as const;

export const COMPONENT_NAME = /^[A-Z]/;

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

export const NODE_ONLY_GLOBALS = new Set([
  "process",
  "require",
  "module",
  "exports",
  "__dirname",
  "__filename",
  "Bun",
  "Deno",
  "Buffer",
]);
