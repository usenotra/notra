import { LINK_TOKEN } from "../constants/nested-links";

export function unnestLinks(html: string): string {
  if (!html.includes("<a")) {
    return html;
  }
  const dropped: boolean[] = [];
  return html.replace(LINK_TOKEN, (token, rawText: string | undefined) => {
    if (rawText !== undefined || token.startsWith("<!--")) {
      return token;
    }
    if (token[1] === "/") {
      return dropped.pop() ? "</span>" : token;
    }
    const inner = dropped.length > 0;
    dropped.push(inner);
    return inner ? "<span>" : token;
  });
}
