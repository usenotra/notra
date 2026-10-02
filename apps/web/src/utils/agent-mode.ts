function isAgentMode(url: URL) {
  return url.searchParams.get("mode") === "agent";
}

export function rewriteAgentModeInput({ url }: { url: URL }) {
  if (url.pathname === "/" && isAgentMode(url)) {
    const rewritten = new URL(url);
    rewritten.pathname = "/agent";
    return rewritten;
  }
}

export function rewriteAgentModeOutput({ url }: { url: URL }) {
  if (url.pathname === "/agent" && isAgentMode(url)) {
    const rewritten = new URL(url);
    rewritten.pathname = "/";
    return rewritten;
  }
}
