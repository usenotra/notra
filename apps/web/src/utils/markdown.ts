const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/;
const MARKDOWN_LINK_TEXT_REGEX = /[\\[\]]/g;

export function textResponse(content: string, status = 200) {
  return new Response(content, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export function markdownSection(title: string, lines: string[]) {
  return [`## ${title}`, "", ...lines, ""].join("\n");
}

export function stripFrontmatter(source: string) {
  return source.replace(FRONTMATTER_REGEX, "").trim();
}

export function escapeMarkdownLinkText(text: string) {
  return text.replace(MARKDOWN_LINK_TEXT_REGEX, "\\$&");
}
