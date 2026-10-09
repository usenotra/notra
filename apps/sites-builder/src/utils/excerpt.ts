import type { RootContent as HastContent } from "hast";
import { fromHtml } from "hast-util-from-html";
import type { Nodes, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { gfm } from "micromark-extension-gfm";
import { mdxjs } from "micromark-extension-mdxjs";

import {
  EXCERPT_CACHE_MAX_BYTES,
  EXCERPT_CACHE_MAX_ENTRIES,
  EXCERPT_MAX_LENGTH,
} from "../constants/seo";

const summaries = new Map<string, string | undefined>();
let summaryBytes = 0;

function htmlText(node: HastContent): string {
  if (node.type === "text") {
    return node.value;
  }
  if (node.type !== "element" || ["script", "style"].includes(node.tagName)) {
    return "";
  }
  return node.children.map(htmlText).join("");
}

function plainText(node: Nodes): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value;
    case "break":
      return " ";
    case "html":
      return fromHtml(node.value, { fragment: true })
        .children.map(htmlText)
        .join("");
    case "mdxJsxTextElement":
    case "mdxJsxFlowElement":
      if (node.name && /^[A-Z]/.test(node.name)) {
        return "";
      }
      return node.children.map(plainText).join("");
    case "paragraph":
    case "emphasis":
    case "strong":
    case "delete":
    case "link":
    case "linkReference":
      return node.children.map(plainText).join("");
    default:
      return "";
  }
}

function summary(body: string): string | undefined {
  let tree: Root;
  try {
    tree = fromMarkdown(body, {
      extensions: [gfm(), mdxjs()],
      mdastExtensions: [gfmFromMarkdown(), mdxFromMarkdown()],
    });
  } catch {
    tree = fromMarkdown(body, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });
  }
  for (const node of tree.children) {
    if (node.type !== "paragraph") {
      continue;
    }
    const text = plainText(node).replace(/\s+/g, " ").trim();
    if (!text) {
      continue;
    }
    return text;
  }
  return undefined;
}

export function excerpt(
  body: string | undefined,
  maxLength = EXCERPT_MAX_LENGTH
): string | undefined {
  if (!body) {
    return undefined;
  }
  let text = summaries.get(body);
  if (!summaries.has(body)) {
    text = summary(body);
    const bytes = 2 * (body.length + (text?.length ?? 0));
    if (bytes <= EXCERPT_CACHE_MAX_BYTES) {
      while (
        summaries.size >= EXCERPT_CACHE_MAX_ENTRIES ||
        summaryBytes + bytes > EXCERPT_CACHE_MAX_BYTES
      ) {
        const oldest = summaries.keys().next().value;
        if (oldest === undefined) {
          break;
        }
        summaryBytes -=
          2 * (oldest.length + (summaries.get(oldest)?.length ?? 0));
        summaries.delete(oldest);
      }
      summaries.set(body, text);
      summaryBytes += bytes;
    }
  }
  if (!text) {
    return undefined;
  }
  const characters: string[] = [];
  for (const character of text) {
    characters.push(character);
    if (characters.length > maxLength) {
      break;
    }
  }
  if (characters.length <= maxLength) {
    return text;
  }
  const cut = characters.slice(0, Math.max(0, maxLength - 1)).join("");
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > cut.length / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
