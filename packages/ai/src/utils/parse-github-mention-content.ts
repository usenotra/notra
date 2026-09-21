import { createProcessor } from "@mdx-js/mdx";
import {
  GITHUB_MENTION_CONTENT_POLICY_REASONS as REASONS,
  GITHUB_MENTION_UNSAFE_HTML_ELEMENTS,
  GITHUB_MENTION_URL_ATTRIBUTES,
} from "@notra/ai/constants/github-mention-content-policy";
import type {
  GitHubMentionActiveConstruct,
  GitHubMentionAstNode,
  GitHubMentionParsedContent,
} from "@notra/ai/types/github-mention-content-policy";
import { fromHtml } from "hast-util-from-html";

const markdownProcessor = createProcessor({ format: "md" });
const mdxProcessor = createProcessor({ format: "mdx" });

function sourceOf(node: GitHubMentionAstNode, source: string) {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return start === undefined || end === undefined
    ? ""
    : source.slice(start, end);
}

function hasExecutableExpression(node: GitHubMentionAstNode) {
  const body = node.data?.estree?.body ?? [];
  return !(
    body.length === 0 ||
    (body.length === 1 && body[0]?.expression?.type === "Literal")
  );
}

function literalExpressionValue(node: GitHubMentionAstNode) {
  const body = node.data?.estree?.body ?? [];
  const expression = body.length === 1 ? body[0]?.expression : undefined;
  return expression?.type === "Literal" ? expression.value : undefined;
}

function normalizeAttributeName(name: string) {
  return name.toLowerCase().replaceAll(":", "");
}

function isExecutableUrl(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }
  let decoded = value;
  for (let pass = 0; pass < 2; pass++) {
    decoded = decoded.replace(/%([\da-f]{2})/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
  }
  return (
    decoded
      // oxlint-disable-next-line no-control-regex -- Browsers ignore controls in URL schemes.
      .replace(/[\u0000-\u0020]+/g, "")
      .toLowerCase()
      .match(/^(?:javascript|data|vbscript):/) !== null
  );
}

function inspectAttributes(
  attributes: readonly GitHubMentionAstNode[],
  ownerSource: string,
  constructs: GitHubMentionActiveConstruct[],
  expressionAlreadyBlocked = false
) {
  let hasBlockedExpression = expressionAlreadyBlocked;
  for (const attribute of attributes) {
    const name = normalizeAttributeName(attribute.name ?? "");
    if (name.startsWith("on")) {
      constructs.push({ reason: REASONS.eventHandler, source: ownerSource });
    }
    const expressionValue =
      attribute.value && typeof attribute.value === "object"
        ? literalExpressionValue(attribute.value as GitHubMentionAstNode)
        : undefined;
    if (
      GITHUB_MENTION_URL_ATTRIBUTES.has(name) &&
      (isExecutableUrl(attribute.value) || isExecutableUrl(expressionValue))
    ) {
      constructs.push({ reason: REASONS.javascriptUrl, source: ownerSource });
    }
    if (
      attribute.type === "mdxJsxExpressionAttribute" &&
      !hasBlockedExpression
    ) {
      constructs.push({ reason: REASONS.expression, source: ownerSource });
      hasBlockedExpression = true;
    } else if (attribute.value && typeof attribute.value === "object") {
      const value = attribute.value as GitHubMentionAstNode;
      if (
        value.type === "mdxJsxAttributeValueExpression" &&
        hasExecutableExpression(value) &&
        !hasBlockedExpression
      ) {
        constructs.push({ reason: REASONS.expression, source: ownerSource });
        hasBlockedExpression = true;
      }
    }
  }
}

function inspectHtml(
  value: string,
  constructs: GitHubMentionActiveConstruct[]
) {
  const root = fromHtml(value, { fragment: true }) as GitHubMentionAstNode;
  const visit = (node: GitHubMentionAstNode) => {
    if (node.type === "element") {
      const elementSource = sourceOf(node, value) || value;
      const name = node.tagName?.toLowerCase() ?? "";
      if (name === "script") {
        constructs.push({ reason: REASONS.script, source: elementSource });
      } else if (GITHUB_MENTION_UNSAFE_HTML_ELEMENTS.has(name)) {
        constructs.push({ reason: REASONS.embed, source: elementSource });
      }
      for (const [property, propertyValue] of Object.entries(
        node.properties ?? {}
      )) {
        const normalized = normalizeAttributeName(property);
        if (normalized.startsWith("on")) {
          constructs.push({
            reason: REASONS.eventHandler,
            source: elementSource,
          });
        }
        if (
          GITHUB_MENTION_URL_ATTRIBUTES.has(normalized) &&
          isExecutableUrl(propertyValue)
        ) {
          constructs.push({
            reason: REASONS.javascriptUrl,
            source: elementSource,
          });
        }
      }
    }
    node.children?.forEach(visit);
  };
  visit(root);
}

export function parseGitHubMentionContent(
  source: string,
  isMdx: boolean
): GitHubMentionParsedContent {
  try {
    const root = (isMdx ? mdxProcessor : markdownProcessor).parse(
      source
    ) as GitHubMentionAstNode;
    const constructs: GitHubMentionActiveConstruct[] = [];
    const visit = (node: GitHubMentionAstNode, htmlCovered = false) => {
      const nodeSource = sourceOf(node, source);
      const coversInlineHtml =
        node.type !== "root" &&
        node.children?.some((child) => child.type === "html");
      if (node.type === "mdxjsEsm") {
        constructs.push({ reason: REASONS.module, source: nodeSource });
      } else if (
        (node.type === "mdxFlowExpression" ||
          node.type === "mdxTextExpression") &&
        hasExecutableExpression(node)
      ) {
        constructs.push({ reason: REASONS.expression, source: nodeSource });
      } else if (
        node.type === "mdxJsxFlowElement" ||
        node.type === "mdxJsxTextElement"
      ) {
        const name = node.name ?? "";
        let expressionAlreadyBlocked = false;
        if (name === "script") {
          constructs.push({ reason: REASONS.script, source: nodeSource });
        } else if (
          GITHUB_MENTION_UNSAFE_HTML_ELEMENTS.has(name.toLowerCase())
        ) {
          constructs.push({ reason: REASONS.embed, source: nodeSource });
        } else if (name && (name.includes(".") || /^[A-Z]/.test(name))) {
          constructs.push({ reason: REASONS.expression, source: nodeSource });
          expressionAlreadyBlocked = true;
        }
        inspectAttributes(
          node.attributes ?? [],
          nodeSource,
          constructs,
          expressionAlreadyBlocked
        );
      } else if (
        node.type === "html" &&
        typeof node.value === "string" &&
        !htmlCovered
      ) {
        inspectHtml(node.value, constructs);
      } else if (
        (node.type === "link" ||
          node.type === "image" ||
          node.type === "definition") &&
        isExecutableUrl(node.url)
      ) {
        constructs.push({ reason: REASONS.javascriptUrl, source: nodeSource });
      }
      let inspectedInlineHtml = false;
      node.children?.forEach((child) => {
        if (coversInlineHtml && child.type === "html") {
          if (!inspectedInlineHtml) {
            // Markdown splits inline HTML into tag nodes and ordinary text.
            // Parse the enclosing block so active element bodies are included.
            inspectHtml(nodeSource, constructs);
            inspectedInlineHtml = true;
          }
          visit(child, true);
        } else {
          visit(child);
        }
      });
    };
    visit(root);
    return { constructs, error: null };
  } catch (error) {
    return {
      constructs: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
