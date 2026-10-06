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
