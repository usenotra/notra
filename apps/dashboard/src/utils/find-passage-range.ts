const WHITESPACE_REGEX = /\s+/g;
const SPACE_REGEX = /\s/;
const BLOCK_SELECTOR =
  "p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td, th, dt, dd, figcaption";

/** Maps a whitespace-collapsed copy of `root`'s text back to DOM positions. */
function indexText(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const positions: { node: Text; offset: number }[] = [];
  let text = "";
  let lastWasSpace = true;
  let lastBlock: Element | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.textContent ?? "";
    // Blocks render on their own lines, which a selection copies as a line
    // break; their text nodes sit side by side, so add the gap here.
    const block = node.parentElement?.closest(BLOCK_SELECTOR) ?? null;
    if (block !== lastBlock && !lastWasSpace) {
      text += " ";
      positions.push({ node: node as Text, offset: 0 });
      lastWasSpace = true;
    }
    lastBlock = block;
    for (let offset = 0; offset < value.length; offset += 1) {
      const isSpace = SPACE_REGEX.test(value[offset] ?? "");
      if (isSpace && lastWasSpace) {
        continue;
      }
      text += isSpace ? " " : value[offset];
      positions.push({ node: node as Text, offset });
      lastWasSpace = isSpace;
    }
  }
  return { text, positions };
}

/**
 * Finds rendered passages inside `root`, ignoring whitespace differences
 * between the selection they came from and the DOM. Missing passages (the
 * agent rewrote them) are skipped.
 */
export function findPassageRanges(
  root: HTMLElement,
  passages: readonly string[]
): Range[] {
  const { text, positions } = indexText(root);
  const ranges: Range[] = [];
  for (const passage of passages) {
    const needle = passage.replace(WHITESPACE_REGEX, " ").trim();
    const start = needle ? text.indexOf(needle) : -1;
    const first = positions[start];
    const last = positions[start + needle.length - 1];
    if (start === -1 || !first || !last) {
      continue;
    }
    const range = document.createRange();
    range.setStart(first.node, first.offset);
    range.setEnd(last.node, last.offset + 1);
    ranges.push(range);
  }
  return ranges;
}

/**
 * The line boxes of the text inside `range`. `Range.getClientRects` also
 * returns whole boxes of fully selected blocks, which would paint a block-wide
 * band instead of the text.
 */
export function getTextLineRects(range: Range): DOMRect[] {
  const root =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;
  if (!root) {
    return [];
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const rects: DOMRect[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) {
      continue;
    }
    const part = document.createRange();
    part.selectNodeContents(node);
    if (node === range.startContainer) {
      part.setStart(node, range.startOffset);
    }
    if (node === range.endContainer) {
      part.setEnd(node, range.endOffset);
    }
    for (const rect of part.getClientRects()) {
      if (rect.width > 0 && rect.height > 0) {
        rects.push(rect);
      }
    }
  }
  return rects;
}
