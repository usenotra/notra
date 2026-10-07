import {
  OFFERING_HIGHLIGHT_CLASSES,
  OFFERING_MARKDOWN_CITATION_PATTERN,
  OFFERING_REGEX_SPECIAL_PATTERN,
  OFFERING_WORD_CHARACTER,
} from "@/constants/offering-check";
import type { OfferingMarkdownNode } from "@/types/offering-check";

/** Drops the inline `([site](url))` citations; sources are shown separately. */
export function stripAnswerCitations(text: string): string {
  return text.replace(OFFERING_MARKDOWN_CITATION_PATTERN, "").trim();
}

function highlightFeatureText(
  node: OfferingMarkdownNode,
  pattern: RegExp
): void {
  if (!node.children || node.tagName === "code" || node.tagName === "pre") {
    return;
  }
  node.children = node.children.flatMap((child): OfferingMarkdownNode[] => {
    if (child.type !== "text" || typeof child.value !== "string") {
      highlightFeatureText(child, pattern);
      return [child];
    }
    return child.value.split(pattern).flatMap((value, index) =>
      value
        ? [
            index % 2 === 0
              ? { type: "text", value }
              : {
                  type: "element",
                  tagName: "mark",
                  properties: {
                    className: [...OFFERING_HIGHLIGHT_CLASSES],
                  },
                  children: [{ type: "text", value }],
                },
          ]
        : []
    );
  });
}

export function createFeatureHighlightPlugin(feature: string) {
  const needle = feature.replaceAll('"', "").trim();
  const pattern = new RegExp(
    `(?<!${OFFERING_WORD_CHARACTER})(${needle.replace(OFFERING_REGEX_SPECIAL_PATTERN, "\\$&")})(?!${OFFERING_WORD_CHARACTER})`,
    "giu"
  );
  return () => (tree: OfferingMarkdownNode) => {
    if (needle.length > 0) {
      highlightFeatureText(tree, pattern);
    }
  };
}
