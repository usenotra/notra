function buildArticlePrompt(title: string, markdownUrl: string) {
  return `Read the article "${title}" at ${markdownUrl} and help me with any questions I have about it.`;
}

export function buildChatGptUrl(title: string, markdownUrl: string) {
  return `https://chatgpt.com/?q=${encodeURIComponent(buildArticlePrompt(title, markdownUrl))}`;
}

export function buildClaudeUrl(title: string, markdownUrl: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(buildArticlePrompt(title, markdownUrl))}`;
}

export function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
