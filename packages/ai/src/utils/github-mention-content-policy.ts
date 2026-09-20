import {
  GITHUB_MENTION_ACTIVE_CONTENT_RULES,
  GITHUB_MENTION_MARKUP_EXTENSIONS,
} from "@notra/ai/constants/github-mention";
import { removeHtmlComments } from "@notra/ai/utils/remove-html-comments";

const MARKUP_EXTENSIONS = new Set<string>(GITHUB_MENTION_MARKUP_EXTENSIONS);
const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;
const FINDING_SNIPPET_LENGTH = 120;
const INLINE_CODE_PLACEHOLDER = "`";
const MDX_EXPRESSION_REASON = "adds an MDX expression";
const EVENT_HANDLER_REASON = "adds an inline event handler";
const TAG_NAME_START_PATTERN = /[a-z]/i;
const MDX_MODULE_REASON = "adds an MDX import or export";
const MDX_MODULE_START_PATTERN = /^\s*(?:import|export)\s/;
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
function renderedLines(markdown: string, preserveCode = false) {
  const lines: string[] = [];
  let openFence: string | null = null;
  for (const raw of removeHtmlComments(markdown).split("\n")) {
    const fence = raw.match(FENCE_PATTERN)?.[1]?.[0];
    if (fence && !openFence) {
      openFence = fence;
    } else if (fence && fence === openFence) {
      openFence = null;
    } else if (!openFence) {
      lines.push(
        preserveCode
          ? raw
          : raw.replace(INLINE_CODE_PATTERN, INLINE_CODE_PLACEHOLDER).trim()
      );
    }
  }
  return lines;
}

function decodeActiveContent(value: string) {
  let decoded = value
    .replace(/&colon;?/gi, ":")
    .replace(
      /&#(?:x([\da-f]+)|(\d+));?/gi,
      (match, hex: string | undefined, decimal: string | undefined) => {
        const radix = hex ? 16 : 10;
        const point = Number.parseInt(hex ?? decimal ?? "", radix);
        return point <= 0x10ffff ? String.fromCodePoint(point) : match;
      }
    );
  for (let pass = 0; pass < 2; pass++) {
    const next = decoded.replace(/%([\da-f]{2})/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
    if (next === decoded) {
      break;
    }
    decoded = next;
  }
  return decoded;
}

/**
 * Lines that are part of an HTML or JSX tag, including the continuation lines
 * of a tag that spans several. A handler only runs as a tag attribute, so
 * prose such as "Set onboarding=true" is not one. A tag that never closes
 * keeps every later line inside it, which errs on the strict side.
 */
function linesInsideTags(lines: readonly string[]) {
  const inside = new Set<string>();
  let open = false;
  let quote: string | null = null;
  for (const line of lines) {
    let touched = open;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (!open) {
        if (
          char === "<" &&
          TAG_NAME_START_PATTERN.test(line[index + 1] ?? "")
        ) {
          open = true;
          touched = true;
        }
      } else if (quote) {
        quote = char === quote ? null : quote;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        open = false;
      }
    }
    if (touched) {
      inside.add(line);
    }
  }
  return inside;
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

/** Only standalone imports can be safely isolated without an MDX parser.
 * Other module code freezes the file: guessing its boundary permits executable
 * continuations, comments, and template literals to bypass the content gate.
 */
function mdxModules(markdown: string) {
  const modules: string[] = [];
  for (const line of renderedLines(markdown, true)) {
    if (!MDX_MODULE_START_PATTERN.test(line)) {
      continue;
    }
    modules.push(
      /^\s*import\s+(?:[\w$*{},\s]+\s+from\s+)?(?:"[^"\\]*"|'[^'\\]*');?\s*$/.test(
        line
      )
        ? line
        : markdown
    );
  }
  return modules;
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
  const tagLines = linesInsideTags(nextLines);
  const findings: GitHubMentionContentFinding[] = [];
  for (const line of new Set(nextLines)) {
    if (!line || known.has(line)) {
      continue;
    }
    const rule = GITHUB_MENTION_ACTIVE_CONTENT_RULES.find((candidate) => {
      if (
        candidate.reason === MDX_MODULE_REASON ||
        (candidate.mdxOnly && extension !== "mdx") ||
        (candidate.reason === EVENT_HANDLER_REASON && !tagLines.has(line))
      ) {
        return false;
      }
      const decoded = decodeActiveContent(line);
      return (
        candidate.pattern.test(decoded) ||
        candidate.pattern.test(decoded.replace(/\s+/g, ""))
      );
    });
    if (rule) {
      findings.push({
        path: params.path,
        reason: rule.reason,
        line: line.slice(0, FINDING_SNIPPET_LENGTH),
      });
    }
  }
  if (extension === "mdx") {
    const knownModules = new Set(mdxModules(params.previous ?? ""));
    for (const statement of new Set(mdxModules(params.next))) {
      if (!knownModules.has(statement)) {
        findings.push({
          path: params.path,
          reason: MDX_MODULE_REASON,
          line: statement.slice(0, FINDING_SNIPPET_LENGTH),
        });
      }
    }
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
