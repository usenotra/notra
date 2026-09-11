import type { GeoChatSkin } from "@notra/ui/types/geo";

const CLAUDE_MARKDOWN_FONT =
  "font-serif [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_p]:font-serif [&_li]:font-serif";

const SANS_MARKDOWN_FONT =
  "font-sans [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_p]:font-sans [&_li]:font-sans";

const TERMINAL_MARKDOWN_FONT =
  "font-mono text-[13px] leading-[1.65] [&_h1]:font-mono [&_h2]:font-mono [&_h3]:font-mono [&_p]:font-mono [&_li]:font-mono";

function isTerminalSkin(skin: GeoChatSkin): boolean {
  return skin === "opencode" || skin === "claude-code" || skin === "codex";
}

export function geoAnswerMarkdownFontClass(skin: GeoChatSkin): string {
  if (skin === "claude") {
    return CLAUDE_MARKDOWN_FONT;
  }
  if (isTerminalSkin(skin)) {
    return TERMINAL_MARKDOWN_FONT;
  }
  return SANS_MARKDOWN_FONT;
}

export function geoAnswerEmptyClassName(skin: GeoChatSkin): string {
  if (skin === "claude") {
    return "font-serif text-[17px] leading-[1.7]";
  }
  if (skin === "perplexity") {
    return "font-sans text-[17.5px] leading-[1.75]";
  }
  if (isTerminalSkin(skin)) {
    return "font-mono text-[13px] leading-[1.65]";
  }
  return "text-[15px] leading-7";
}

export function geoAnswerThinkingClassName(skin: GeoChatSkin): string {
  if (skin === "claude") {
    return "font-serif text-[17px]";
  }
  if (skin === "perplexity") {
    return "font-sans text-[17.5px]";
  }
  if (isTerminalSkin(skin)) {
    return "font-mono text-[13px]";
  }
  return "text-[15px]";
}
