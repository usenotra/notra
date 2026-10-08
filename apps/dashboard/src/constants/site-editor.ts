import {
  CssFile01Icon,
  DocumentCodeIcon,
  File01Icon,
  FileBracesIcon,
  FileCodeIcon,
  FileImageIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { SupportedLanguages, ThemesType } from "@pierre/diffs";

import type { SiteEditorLanguage } from "@/types/site-editor";

export const SITE_EDITOR_COLLAPSED_FOLDERS: readonly string[] = ["public"];

export const SITE_EDITOR_LOADING_LINES = [
  "w-1/3",
  "w-2/3",
  "w-1/2",
  "w-3/5",
  "w-1/4",
] as const;

export const SITE_FILE_TREE_SKELETON_ROWS = [
  "w-1/2",
  "w-3/4",
  "w-2/3",
  "w-2/5",
  "w-3/5",
  "w-5/6",
  "w-1/3",
] as const;

export const SITE_EDITOR_EDIT_STATE_PREFIX = "notra-site";

export const SITE_EDITOR_LANGUAGES: Record<string, SiteEditorLanguage> = {
  mdx: "mdx",
  md: "markdown",
  json: "json",
  jsx: "jsx",
  js: "jsx",
  css: "css",
};

export const SITE_EDITOR_LANGUAGE_LABELS: Record<SiteEditorLanguage, string> = {
  mdx: "MDX",
  markdown: "Markdown",
  json: "JSON",
  jsx: "JSX",
  css: "CSS",
  text: "Text",
};

export const SITE_EDITOR_FILE_ICONS: Record<
  SiteEditorLanguage | "image",
  IconSvgElement
> = {
  mdx: DocumentCodeIcon,
  markdown: DocumentCodeIcon,
  json: FileBracesIcon,
  jsx: FileCodeIcon,
  css: CssFile01Icon,
  image: FileImageIcon,
  text: File01Icon,
};

export const SITE_EDITOR_IMAGE_EXTENSIONS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "svg",
  "ico",
];

export const SITE_CODE_THEME: ThemesType = {
  light: "pierre-light",
  dark: "pierre-dark",
};

export const SITE_CODE_LANGUAGES: readonly SupportedLanguages[] = [
  "mdx",
  "markdown",
  "tsx",
  "jsx",
  "yaml",
  "json",
  "css",
  "shellscript",
];

export const SITE_CODE_SURFACE_CLASS =
  "[--diffs-font-family:var(--font-geist-mono)] [--diffs-header-font-family:var(--font-inter)] [--diffs-font-size:16px] [--diffs-line-height:26px] [--diffs-tab-size:2] [--diffs-min-number-column-width:3ch] [--diffs-gap-inline:12px] md:[--diffs-font-size:13px] md:[--diffs-line-height:22px]";

const SITE_CODE_BASE_CSS = `
:host {
  --diffs-light-bg: var(--background);
  --diffs-dark-bg: var(--background);
  --diffs-fg-number-override: color-mix(in oklab, var(--muted-foreground) 55%, transparent);
  --diffs-bg-selection-override: color-mix(in oklab, var(--primary) 16%, transparent);
  --diffs-bg-selection-number-override: color-mix(in oklab, var(--primary) 24%, transparent);
  --diffs-bg-caret-override: var(--foreground);
  --diffs-bg-separator-override: color-mix(in oklab, var(--muted) 70%, var(--background));
  --diffs-bg-buffer-override: var(--background);
}
`.trim();

export const SITE_CODE_EDITOR_CSS = `
${SITE_CODE_BASE_CSS}
pre {
  padding-block: 12px;
}
`.trim();

export const SITE_CODE_DIFF_CSS = `
${SITE_CODE_BASE_CSS}
:host {
  --diffs-bg-context-override: var(--background);
  --diffs-bg-context-gutter-override: var(--background);
}
`.trim();

export const SITE_FILE_TREE_CSS = `
:host {
  --trees-bg-override: transparent;
  --trees-fg-override: var(--muted-foreground);
  --trees-fg-muted-override: var(--muted-foreground);
  --trees-bg-muted-override: color-mix(in oklab, var(--background) 60%, transparent);
  --trees-selected-bg-override: var(--background);
  --trees-selected-fg-override: var(--foreground);
  --trees-focus-ring-color-override: transparent;
  --trees-selected-focused-border-color-override: transparent;
  --trees-border-color-override: var(--shell-border);
  --trees-indent-guide-bg-override: transparent;
  --trees-font-family-override: var(--font-inter);
  --trees-font-size-override: 13px;
  --trees-search-bg-override: var(--background);
  --trees-search-fg-override: var(--foreground);
  --trees-search-font-weight-override: 400;
  --trees-input-bg-override: var(--background);
  --trees-border-radius-override: 6px;
  --trees-status-added-override: var(--success);
  --trees-status-modified-override: var(--warning);
  --trees-file-icon-color: color-mix(in oklab, var(--muted-foreground) 80%, transparent);
}
button[data-type='item']::before {
  content: none;
}
button[data-type='item'][data-item-selected] {
  box-shadow: 0 0 0 1px var(--shell-border), 0 1px 2px rgb(0 0 0 / 0.05);
}
:host(:focus-within) button[data-type='item'][data-item-focused]:not([data-item-selected]) {
  background-color: color-mix(in oklab, var(--foreground) 7%, transparent);
}
[data-item-section='content'] {
  white-space: nowrap;
}
[data-item-section='content'] :is(div, span) {
  display: inline;
  direction: ltr;
}
[data-item-section='content'] :is([data-truncate-content='overflow'], [data-truncate-marker-cell], [data-truncate-fill]) {
  display: none;
}
[data-item-git-status] > [data-item-section='content'] {
  color: inherit;
}
[data-item-git-status] > [data-item-section='icon'] > * {
  color: var(--trees-file-icon-color);
}
[data-item-section='git'] {
  font-size: 0;
}
[data-item-contains-git-change='true'] > [data-item-section='git'] {
  visibility: hidden;
}
[data-item-git-status] > [data-item-section='git']::after {
  content: '';
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--trees-item-git-status-color);
}
${SITE_EDITOR_IMAGE_EXTENSIONS.map(
  (extension) => `button[data-item-path$='.${extension}']`
).join(",\n")} {
  opacity: 0.5;
  cursor: default;
}
`.trim();

export const ENTRY_FILE = /^(blog|changelog)\/(.+)\.mdx?$/;
