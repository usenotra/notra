import type { Element, ElementContent, Root as HastRoot } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toMdast } from "hast-util-to-mdast";
import type { Root as MdastRoot } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { SKIP, visit } from "unist-util-visit";

import {
  BLOCK_TAGS,
  DROPPED_TAGS,
  TEXT_BLOCK_TAGS,
} from "../constants/markdown";

function text(value: string): ElementContent {
  return { type: "text", value };
}

function strong(value: string): Element {
  return {
    type: "element",
    tagName: "strong",
    properties: {},
    children: [text(value)],
  };
}

function paragraph(children: ElementContent[]): Element {
  return { type: "element", tagName: "p", properties: {}, children };
}

function findMarkdownRoot(tree: HastRoot): Element | null {
  let root: Element | null = null;
  visit(tree, "element", (node) => {
    if (node.properties.dataMdRoot !== undefined) {
      root = node;
      return false;
    }
    return undefined;
  });
  return root;
}

function simplify(root: Element) {
  visit(root, "comment", (_node, index, parent) => {
    if (parent && index !== undefined) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }
    return undefined;
  });
  visit(root, "element", (node, index, parent) => {
    if (!parent || index === undefined) {
      return undefined;
    }
    if (isDropped(node)) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }
    const props = node.properties;
    if (node.tagName === "pre" && typeof props.dataLanguage === "string") {
      const code = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "code"
      );
      if (code && props.dataLanguage !== "plaintext") {
        code.properties.className = [`language-${props.dataLanguage}`];
      }
    }
    if (node.tagName === "aside" && typeof props.ariaLabel === "string") {
      node.tagName = "blockquote";
      let titled = false;
      visit(node, "element", (inner) => {
        if (inner.properties.dataCalloutTitle !== undefined) {
          inner.children = [strong(textOf(inner))];
          titled = true;
        }
      });
      if (!titled) {
        node.children.unshift(paragraph([strong(props.ariaLabel)]));
      }
    }
    if (props.dataNotraTabTitle !== undefined || node.tagName === "summary") {
      node.tagName = "p";
      node.children = [strong(textOf(node))];
      return SKIP;
    }
    if (
      node.tagName === "a" &&
      node.children.some(
        (child) => child.type === "element" && BLOCK_TAGS.has(child.tagName)
      )
    ) {
      const [title = textOf(node), ...rest] = textBlocks(node);
      parent.children[index] = paragraph([
        { ...node, children: [text(title)] },
        ...(rest.length > 0 ? [text(`: ${rest.join(" ")}`)] : []),
      ]);
      return SKIP;
    }
    if (node.tagName === "figcaption") {
      node.tagName = "p";
      node.children = [
        {
          type: "element",
          tagName: "em",
          properties: {},
          children: node.children,
        },
      ];
    }
    return undefined;
  });
}

function isDropped(node: Element): boolean {
  return (
    DROPPED_TAGS.has(node.tagName) || node.properties.dataMdSkip !== undefined
  );
}

function textOf(node: Element | ElementContent): string {
  if (node.type === "text") {
    return node.value;
  }
  if (node.type !== "element" || isDropped(node)) {
    return "";
  }
  return node.children.map(textOf).join("").trim();
}

function textBlocks(node: Element): string[] {
  const blocks: string[] = [];
  for (const child of node.children) {
    if (child.type !== "element" || isDropped(child)) {
      continue;
    }
    const hasOwnText = child.children.some(
      (inner) => inner.type === "text" && inner.value.trim() !== ""
    );
    if (TEXT_BLOCK_TAGS.has(child.tagName) || hasOwnText) {
      blocks.push(textOf(child));
    } else {
      blocks.push(...textBlocks(child));
    }
  }
  return blocks.filter(Boolean);
}

function absolutize(tree: MdastRoot, pageUrl: string) {
  visit(tree, (node) => {
    if ((node.type === "link" || node.type === "image") && node.url) {
      try {
        node.url = new URL(node.url, pageUrl).toString();
      } catch {
        return;
      }
    }
  });
}

export function htmlToMarkdown(html: string, pageUrl: string): string {
  const root = findMarkdownRoot(fromHtml(html));
  if (!root) {
    return "";
  }
  simplify(root);
  const mdast = toMdast({ type: "root", children: root.children }) as MdastRoot;
  absolutize(mdast, pageUrl);
  return toMarkdown(mdast, {
    extensions: [gfmToMarkdown()],
    bullet: "-",
    fences: true,
    rule: "-",
  }).trim();
}
