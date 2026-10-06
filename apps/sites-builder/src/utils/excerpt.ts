import { EXCERPT_MAX_LENGTH, NON_PROSE_BLOCK } from "../constants/seo";

function plainText(block: string): string {
  return block
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<([A-Z][\w.]*)\b[^>]*>[\s\S]*?<\/\1>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/(\*\*|__|~~|`)/g, "")
    .replace(/(^|[\s(])[*_](?=\S)/g, "$1")
    .replace(/(\S)[*_](?=[\s).,;:!?]|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(
  body: string | undefined,
  maxLength = EXCERPT_MAX_LENGTH
): string | undefined {
  if (!body) {
    return undefined;
  }
  let inFence = false;
  for (const block of body.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    const fences = trimmed.match(/^(?:```|~~~)/gm)?.length ?? 0;
    if (inFence || NON_PROSE_BLOCK.test(trimmed)) {
      if (fences % 2 === 1) {
        inFence = !inFence;
      }
      continue;
    }
    const text = plainText(trimmed);
    if (!text) {
      continue;
    }
    if (text.length <= maxLength) {
      return text;
    }
    const cut = text.slice(0, maxLength - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
  }
  return undefined;
}
