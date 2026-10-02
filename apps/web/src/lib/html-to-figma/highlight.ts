const TOKEN_RE =
  /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([a-zA-Z][\w-]*)((?:[^&]|&(?!lt;))*?)(\/?&gt;)/g;
const ATTR_RE = /([a-zA-Z_:][\w:.-]*)(?:(=)("[^"]*"|'[^']*'))?/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightAttributes(attrs: string): string {
  return attrs.replace(
    ATTR_RE,
    (match, name: string, eq?: string, value?: string) => {
      if (!name) {
        return match;
      }

      const namePart = `<span class="html-token-attr">${name}</span>`;
      const eqPart = eq ? `<span class="html-token-punct">${eq}</span>` : "";
      const valuePart = value
        ? `<span class="html-token-string">${value}</span>`
        : "";

      return `${namePart}${eqPart}${valuePart}`;
    }
  );
}

export function highlightHtml(code: string): string {
  return escapeHtml(code).replace(
    TOKEN_RE,
    (
      _full,
      comment: string | undefined,
      open: string | undefined,
      name: string | undefined,
      attrs: string | undefined,
      close: string | undefined
    ) => {
      if (comment) {
        return `<span class="html-token-comment">${comment}</span>`;
      }

      const openPart = `<span class="html-token-punct">${open}</span>`;
      const namePart = `<span class="html-token-tag">${name}</span>`;
      const attrsPart = highlightAttributes(attrs ?? "");
      const closePart = `<span class="html-token-punct">${close}</span>`;

      return `${openPart}${namePart}${attrsPart}${closePart}`;
    }
  );
}
