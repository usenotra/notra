import {
  GITHUB_MENTION_ACTIVE_CONTENT_RULES,
  GITHUB_MENTION_MARKUP_EXTENSIONS,
} from "@notra/ai/constants/github-mention";

const MARKUP_EXTENSIONS = new Set<string>(GITHUB_MENTION_MARKUP_EXTENSIONS);
const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;
const FINDING_SNIPPET_LENGTH = 120;
const INLINE_CODE_PLACEHOLDER = "`";
const MDX_EXPRESSION_REASON = "adds an MDX expression";
// What is left of a literal-only expression once strings, comments, and
// object keys are removed: `{600}`, `{"a"}`, `{{ color: "red" }}`, `{[1, 2]}`.
const EXPRESSION_STRING_PATTERN = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
const EXPRESSION_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const EXPRESSION_KEY_PATTERN = /[\w$]+\s*:/g;
const EXPRESSION_KEYWORD_PATTERN = /\b(?:true|false|null)\b/g;
const LITERAL_REMAINDER_PATTERN = /^[\s\d.,[\]{}-]*$/;

export interface GitHubMentionContentFinding {
  path: string;
  reason: string;
  line: string;
}

function extensionOf(path: string) {
  const fileName = path.split("/").at(-1) ?? "";
  return fileName.includes(".")
    ? (fileName.split(".").at(-1) ?? "").toLowerCase()
    : "";
}

/** Lines a renderer treats as markup. Code samples are shown, never run. */
function renderedLines(markdown: string) {
  const lines: string[] = [];
  let openFence: string | null = null;
  for (const raw of markdown.split("\n")) {
    const fence = raw.match(FENCE_PATTERN)?.[1]?.[0];
    if (fence && !openFence) {
      openFence = fence;
    } else if (fence && fence === openFence) {
      openFence = null;
    } else if (!openFence) {
      lines.push(
        raw.replace(INLINE_CODE_PATTERN, INLINE_CODE_PLACEHOLDER).trim()
      );
    }
  }
  return lines;
}

/** Bodies of the top-level `{...}` expressions, across lines. `\\{` is text. */
function mdxExpressions(lines: readonly string[]) {
  const text = lines.join("\n");
  const bodies: string[] = [];
  let depth = 0;
  let start = 0;
  let quote: string | null = null;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "\\") {
      index++;
    } else if (quote) {
      quote = char === quote ? null : quote;
    } else if (depth > 0 && (char === '"' || char === "'")) {
      quote = char;
    } else if (char === "{") {
      depth++;
      if (depth === 1) {
        start = index + 1;
      }
    } else if (char === "}" && depth > 0) {
      depth--;
      if (depth === 0) {
        bodies.push(text.slice(start, index).trim());
      }
    }
  }
  // Never closed: MDX would fail or swallow the rest, so it counts as one.
  if (depth > 0) {
    bodies.push(text.slice(start).trim());
  }
  return bodies;
}

function isLiteralExpression(body: string) {
  const remainder = body
    .replace(EXPRESSION_COMMENT_PATTERN, "")
    .replace(EXPRESSION_STRING_PATTERN, "")
    .replace(EXPRESSION_KEY_PATTERN, "")
    .replace(EXPRESSION_KEYWORD_PATTERN, "");
  return LITERAL_REMAINDER_PATTERN.test(remainder);
}

/**
 * Active content a change adds to a Markdown or MDX file: MDX module code and
 * expressions run at build time, scripts and handlers in the reader's browser.
 * Lines that were already in the file pass, so existing imports and embeds
 * stay editable. The path allowlist keeps mentions in content files; this
 * keeps the content from becoming code.
 */
export function findNewActiveContent(params: {
  path: string;
  previous: string | null;
  next: string;
}): GitHubMentionContentFinding[] {
  const extension = extensionOf(params.path);
  if (!MARKUP_EXTENSIONS.has(extension)) {
    return [];
  }
  const previousLines = renderedLines(params.previous ?? "");
  const nextLines = renderedLines(params.next);
  const known = new Set(previousLines);
  const findings: GitHubMentionContentFinding[] = [];
  for (const line of new Set(nextLines)) {
    if (!line || known.has(line)) {
      continue;
    }
    const rule = GITHUB_MENTION_ACTIVE_CONTENT_RULES.find(
      (candidate) =>
        (!candidate.mdxOnly || extension === "mdx") &&
        candidate.pattern.test(line)
    );
    if (rule) {
      findings.push({
        path: params.path,
        reason: rule.reason,
        line: line.slice(0, FINDING_SNIPPET_LENGTH),
      });
    }
  }
  if (extension === "mdx") {
    // Expressions run when the page renders: `{process.env.KEY}` would print
    // a secret into the built site. Literals and comments are just markup.
    const knownExpressions = new Set(mdxExpressions(previousLines));
    for (const body of new Set(mdxExpressions(nextLines))) {
      if (!(knownExpressions.has(body) || isLiteralExpression(body))) {
        findings.push({
          path: params.path,
          reason: MDX_EXPRESSION_REASON,
          line: `{${body}}`.slice(0, FINDING_SNIPPET_LENGTH),
        });
      }
    }
  }
  return findings;
}
