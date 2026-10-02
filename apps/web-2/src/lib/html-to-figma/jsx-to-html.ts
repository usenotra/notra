const UNITLESS_PROPS = new Set([
  "animationIterationCount",
  "aspectRatio",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexShrink",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridRow",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  "strokeOpacity",
  "strokeWidth",
]);

const VOID_TAGS = new Set([
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
  "param",
  "source",
  "track",
  "wbr",
]);

const NUMERIC_RE = /^-?\d*\.?\d+$/;
const SINGLE_BRACE_ATTR_RE =
  /([a-zA-Z_:][\w:-]*)=\{\s*(`[^`]*`|"[^"]*"|'[^']*'|[^{}]*?)\s*\}/g;
const CLASSNAME_RE = /\bclassName=/g;
const HTML_FOR_RE = /\bhtmlFor=/g;
const SELF_CLOSING_RE = /<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)\/>/g;

function camelToKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  const last = trimmed.at(-1);

  if (
    trimmed.length >= 2 &&
    first === last &&
    (first === '"' || first === "'" || first === "`")
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function splitTopLevel(body: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";

  for (const char of body) {
    if (quote) {
      current += char;
      if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
    }

    if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

function declarationFromEntry(entry: string): string | null {
  const separatorIndex = splitTopLevel(entry, ":")[0]?.length ?? -1;

  if (separatorIndex < 0 || separatorIndex >= entry.length) {
    return null;
  }

  const rawKey = entry.slice(0, separatorIndex).trim();
  const rawValue = entry.slice(separatorIndex + 1).trim();

  if (!(rawKey && rawValue)) {
    return null;
  }

  const key = camelToKebab(stripQuotes(rawKey));
  let value = stripQuotes(rawValue);

  if (NUMERIC_RE.test(value) && !UNITLESS_PROPS.has(stripQuotes(rawKey))) {
    value = `${value}px`;
  }

  return `${key}:${value}`;
}

function styleObjectToCss(body: string): string {
  return splitTopLevel(body, ",")
    .map((entry) => declarationFromEntry(entry))
    .filter((declaration): declaration is string => declaration !== null)
    .join(";");
}

function convertStyleObjects(input: string): string {
  let result = "";
  let cursor = 0;
  const marker = "style={{";

  let start = input.indexOf(marker, cursor);
  while (start !== -1) {
    result += input.slice(cursor, start);

    let depth = 0;
    let index = start + "style=".length;

    while (index < input.length) {
      const char = input[index];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          index += 1;
          break;
        }
      }
      index += 1;
    }

    const body = input.slice(start + marker.length, index - 2);
    result += `style="${styleObjectToCss(body)}"`;
    cursor = index;
    start = input.indexOf(marker, cursor);
  }

  result += input.slice(cursor);
  return result;
}

export function jsxToHtml(input: string): string {
  let html = convertStyleObjects(input);

  html = html.replace(
    SINGLE_BRACE_ATTR_RE,
    (_match, name: string, value: string) => `${name}="${stripQuotes(value)}"`
  );

  html = html.replace(CLASSNAME_RE, "class=").replace(HTML_FOR_RE, "for=");

  html = html.replace(SELF_CLOSING_RE, (match, tag: string, attrs: string) =>
    VOID_TAGS.has(tag.toLowerCase()) ? match : `<${tag}${attrs}></${tag}>`
  );

  return html;
}
