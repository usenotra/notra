import { detectAIBot, negotiateFormat, toMarkdownPath } from "@dualmark/core";

import { DUALMARK_SKIP_PATHS, MARKDOWN_NAMESPACE } from "@/constants/proxy";
import { serveMarkdownTwin } from "@/lib/markdown/handler";

const MARKDOWN_EXTENSION_REGEX = /\.md$/;
const TRAILING_SLASHES_REGEX = /\/+$/;

function shouldSkip(pathname: string) {
  if (pathname === "/llms.txt" || pathname === "/favicon.ico") {
    return true;
  }
  if (pathname.startsWith(`/${MARKDOWN_NAMESPACE}/`)) {
    return true;
  }
  return DUALMARK_SKIP_PATHS.some(
    (skip) => pathname === skip || pathname.startsWith(`${skip}/`)
  );
}

function toMarkdownTwinPath(pathname: string) {
  const stripped = pathname
    .replace(MARKDOWN_EXTENSION_REGEX, "")
    .replace(TRAILING_SLASHES_REGEX, "");
  if (stripped === "" || stripped === "/") {
    return ["index"];
  }
  return stripped.split("/").filter(Boolean);
}

export function appendHeaderValue(
  headers: Headers,
  name: string,
  value: string
) {
  const existing = headers.get(name);
  headers.set(name, existing ? `${existing}, ${value}` : value);
}

function appendVaryAccept(headers: Headers) {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((token) => token.trim().toLowerCase());
  if (!tokens.includes("accept")) {
    headers.set("Vary", `${existing}, Accept`);
  }
}

export async function negotiateMarkdown(
  request: Request,
  next: () => Promise<Response>
) {
  const { pathname } = new URL(request.url);

  if (shouldSkip(pathname)) {
    return next();
  }

  if (pathname.endsWith(".md")) {
    return serveMarkdownTwin(request, toMarkdownTwinPath(pathname));
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const accept = request.headers.get("accept") ?? "";
  const format = negotiateFormat(accept);

  if (detectAIBot(userAgent).isBot || format === "markdown") {
    return serveMarkdownTwin(request, toMarkdownTwinPath(pathname));
  }

  if (format === null && accept) {
    return new Response(
      "Not Acceptable\n\nSupported: text/html, text/markdown\n",
      {
        status: 406,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "Accept",
        },
      }
    );
  }

  const response = await next();
  appendHeaderValue(
    response.headers,
    "Link",
    `<${toMarkdownPath(pathname)}>; rel="alternate"; type="text/markdown"`
  );
  appendVaryAccept(response.headers);
  return response;
}
