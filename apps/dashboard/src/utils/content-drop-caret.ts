// Preserve both the node and its boundary offset when locating a file drop in Firefox or Chromium.
export function contentDropCaret(
  doc: Document,
  x: number,
  y: number
): { node: Node; offset: number } | null {
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) {
    return { node: position.offsetNode, offset: position.offset };
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  return range
    ? { node: range.startContainer, offset: range.startOffset }
    : null;
}
