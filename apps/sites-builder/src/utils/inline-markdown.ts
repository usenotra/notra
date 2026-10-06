import {
  INLINE_CODE,
  INLINE_EMPHASIS,
  INLINE_LINK,
  INLINE_PLACEHOLDER,
  INLINE_SAFE_HREF,
  INLINE_STRONG,
} from "../constants/inline-markdown";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emphasis(escaped: string): string {
  return escaped
    .replace(
      STRONG,
      (_, a?: string, b?: string) => `<strong>${a ?? b}</strong>`
    )
    .replace(EMPHASIS, (_, a?: string, b?: string) => `<em>${a ?? b}</em>`);
}

export function renderInlineMarkdown(source: string): string {
  const pieces: string[] = [];
  const hold = (html: string) => {
    pieces.push(html);
    return `\uE000${pieces.length - 1}\uE000`;
  };
  const withoutMarkers = source.replaceAll("\uE000", "");
  const withCode = withoutMarkers.replace(CODE, (_, code: string) =>
    hold(`<code>${escapeHtml(code)}</code>`)
  );
  const withLinks = withCode.replace(
    LINK,
    (_, label: string, target: string) => {
      const text = emphasis(escapeHtml(label));
      return hold(
        SAFE_HREF.test(target)
          ? `<a href="${escapeHtml(target)}">${text}</a>`
          : text
      );
    }
  );
  const html = emphasis(escapeHtml(withLinks));
  let restored = html;
  while (restored.includes("\uE000")) {
    restored = restored.replace(
      PLACEHOLDER,
      (_, index: string) => pieces[Number(index)] ?? ""
    );
  }
  return restored;
}
