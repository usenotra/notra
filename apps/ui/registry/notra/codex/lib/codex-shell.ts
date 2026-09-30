import type { CodexShellToken } from "../types/codex";

const SHELL_TOKEN_PATTERN =
  /(\s+)|('[^']*'?|"[^"]*"?)|(&&|\|\||[|;<>])|([^\s'"|;&<>]+|&)/g;

export const tokenizeShellCommand = (command: string): CodexShellToken[] => {
  const tokens: CodexShellToken[] = [];
  let expectsCommand = true;

  for (const match of command.matchAll(SHELL_TOKEN_PATTERN)) {
    const [text, space, quoted, operator] = match;
    if (space) {
      tokens.push({ kind: "space", text });
    } else if (quoted) {
      tokens.push({ kind: "string", text });
      expectsCommand = false;
    } else if (operator) {
      tokens.push({ kind: "operator", text });
      expectsCommand = true;
    } else if (expectsCommand) {
      tokens.push({ kind: "command", text });
      expectsCommand = false;
    } else {
      tokens.push({ kind: text.startsWith("-") ? "flag" : "argument", text });
    }
  }

  return tokens;
};
