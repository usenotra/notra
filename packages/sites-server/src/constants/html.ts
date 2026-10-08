export const HTML_NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  middot: "·",
  copy: "©",
};

export const HTML_RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set([
  "script",
  "style",
  "template",
  "noscript",
  "textarea",
]);

export const HTML_VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

export const TAG =
  /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
export const ATTRIBUTE =
  /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
export const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi;
export const WHITESPACE = /\s+/g;
