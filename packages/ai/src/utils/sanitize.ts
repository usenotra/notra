import sanitizeHtml from "sanitize-html";

export function sanitizeMarkdownHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "a",
      "strong",
      "em",
      "del",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
      "video",
      "div",
      "span",
      "sup",
      "sub",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      video: ["src", "controls"],
      code: ["class"],
      pre: ["class"],
      td: ["align"],
      th: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      video: ["http", "https"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
}
