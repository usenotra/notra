import { SAXParser } from "parse5-sax-parser";

import type { HtmlTokenEdit } from "../types/nested-links";

export function unnestLinks(html: string): string {
  if (!/<a(?:\s|\/|>)/i.test(html)) {
    return html;
  }
  const parser = new SAXParser({ sourceCodeLocationInfo: true });
  const dropped: boolean[] = [];
  const edits: HtmlTokenEdit[] = [];
  parser.on("startTag", (token) => {
    if (token.tagName !== "a") {
      return;
    }
    const inner = dropped.length > 0;
    dropped.push(inner);
    if (inner && token.sourceCodeLocation) {
      edits.push({ ...token.sourceCodeLocation, replacement: "<span>" });
    }
  });
  parser.on("endTag", (token) => {
    if (token.tagName === "a" && dropped.pop() && token.sourceCodeLocation) {
      edits.push({ ...token.sourceCodeLocation, replacement: "</span>" });
    }
  });
  parser.end(html);
  let result = "";
  let offset = 0;
  for (const edit of edits) {
    result += html.slice(offset, edit.startOffset) + edit.replacement;
    offset = edit.endOffset;
  }
  return result + html.slice(offset);
}
