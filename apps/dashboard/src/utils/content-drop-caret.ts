// Locate the browser caret at a file drop in both Firefox and Chromium without using stale editor selection.
export function contentDropCaretNode(
  doc: Document,
  x: number,
  y: number
): Node | null {
  return (
    doc.caretPositionFromPoint?.(x, y)?.offsetNode ??
    doc.caretRangeFromPoint?.(x, y)?.startContainer ??
    null
  );
}
