import {
  MARKDOWN_CACHE_CONTROL,
  NOT_FOUND_MARKDOWN,
} from "@/constants/not-found";

export function markdownNotFoundResponse() {
  return new Response(NOT_FOUND_MARKDOWN, {
    status: 404,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": MARKDOWN_CACHE_CONTROL,
      vary: "Accept",
    },
  });
}

export class MarkdownNotFoundError extends Error {
  constructor(pathname: string) {
    super(`No markdown twin for ${pathname}`);
    this.name = "MarkdownNotFoundError";
  }
}
