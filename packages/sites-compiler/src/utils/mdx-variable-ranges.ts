import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import { visit } from "unist-util-visit";

import { VARIABLE_OR_CODE_SPAN } from "../constants/variables";
import type { SourceRange } from "../types/estree";
import { nodeRange } from "./estree";
import { expressionPrograms } from "./mdast";

export function mdxVariableCodeRanges(source: string): SourceRange[] {
  // Mask placeholders without moving offsets so MDX can distinguish prose from JavaScript.
  const masked = source.replace(
    VARIABLE_OR_CODE_SPAN,
    (match, codeSpan, name) =>
      codeSpan !== undefined || name === undefined
        ? match
        : match.replace(/[^\r\n]/g, "x")
  );
  try {
    const tree = fromMarkdown(masked, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()],
    });
    const ranges: SourceRange[] = [];
    visit(tree, (node) => {
      if (node.type === "mdxjsEsm") {
        const start = node.position?.start.offset;
        const end = node.position?.end.offset;
        if (start !== undefined && end !== undefined) {
          ranges.push({ start, end });
        }
      }
      ranges.push(...expressionPrograms(node).map(nodeRange));
    });
    return ranges;
  } catch {
    // Leave malformed MDX untouched; the compiler reports its syntax error.
    return [{ start: 0, end: source.length }];
  }
}
