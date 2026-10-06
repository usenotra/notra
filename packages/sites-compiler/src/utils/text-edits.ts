import { FRONTMATTER_BLOCK } from "../constants/frontmatter";
import type { BlankedFrontmatter, TextEdit } from "../types/mdx";

export function blankFrontmatter(source: string): BlankedFrontmatter {
  const match = FRONTMATTER_BLOCK.exec(source);
  if (!match) {
    return { text: source, length: 0 };
  }
  const blanked = match[0].replace(/[^\n]/g, " ");
  return {
    text: blanked + source.slice(match[0].length),
    length: match[0].length,
  };
}

export function applyEdits(source: string, edits: readonly TextEdit[]): string {
  let output = source;
  for (const edit of [...edits].sort(
    (a, b) => b.start - a.start || b.end - a.end
  )) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}
