import {
  HTML_NAMED_ENTITIES,
  HTML_RAW_TEXT_ELEMENTS,
  HTML_VOID_ELEMENTS,
} from "../constants/html";
import type { HtmlToken } from "../types/html";

const TAG =
  /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const ATTRIBUTE =
  /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi;
const WHITESPACE = /\s+/g;

function safeCodePoint(code: number): string | null {
  return Number.isInteger(code) && code > 0 && code <= 0x10_ff_ff
    ? String.fromCodePoint(code)
    : null;
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(ENTITY, (match, decimal, hex, name) => {
    if (decimal) {
      return safeCodePoint(Number.parseInt(decimal, 10)) ?? match;
    }
    if (hex) {
      return safeCodePoint(Number.parseInt(hex, 16)) ?? match;
    }
    return HTML_NAMED_ENTITIES[String(name).toLowerCase()] ?? match;
  });
}

export function collapseHtmlText(value: string): string {
  return decodeHtmlEntities(value).replace(WHITESPACE, " ").trim();
}

function parseAttributes(source: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = match[1]?.toLowerCase();
    if (!name || attrs.has(name)) {
      continue;
    }
    attrs.set(name, decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attrs;
}

export function* tokenizeHtml(html: string): Generator<HtmlToken> {
  const tag = new RegExp(TAG.source, "g");
  let lowerHtml: string | undefined;
  let last = 0;
  let match = tag.exec(html);
  while (match) {
    if (match.index > last) {
      yield { kind: "text", text: html.slice(last, match.index) };
    }
    last = tag.lastIndex;
    const [, closeName, openName, rawAttrs, selfClosing] = match;
    if (closeName) {
      yield { kind: "close", name: closeName.toLowerCase() };
    } else if (openName) {
      const name = openName.toLowerCase();
      const isVoid = HTML_VOID_ELEMENTS.has(name) || selfClosing === "/";
      yield {
        kind: "open",
        name,
        attrs: parseAttributes(rawAttrs ?? ""),
        void: isVoid,
      };
      if (HTML_RAW_TEXT_ELEMENTS.has(name) && !isVoid) {
        lowerHtml ??= html.toLowerCase();
        const end = lowerHtml.indexOf(`</${name}`, last);
        const resume = end === -1 ? html.length : end;
        last = resume;
        tag.lastIndex = resume;
      }
    }
    match = tag.exec(html);
  }
  if (last < html.length) {
    yield { kind: "text", text: html.slice(last) };
  }
}
