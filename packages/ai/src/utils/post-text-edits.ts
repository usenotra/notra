import type {
  PostTextEdit,
  PostTextEditResult,
} from "@notra/ai/types/post-text-edits";

/**
 * Applies find/replace edits in order. Each `find` must match exactly once in
 * the text as it stands after the previous edits, so an ambiguous or stale
 * edit fails instead of changing the wrong passage.
 */
export function applyPostTextEdits(
  markdown: string,
  edits: readonly PostTextEdit[]
): PostTextEditResult {
  let next = markdown;
  for (const [index, edit] of edits.entries()) {
    const first = next.indexOf(edit.find);
    if (first === -1) {
      return {
        ok: false,
        error: `Edit ${index + 1}: the find text does not appear in the post. Call viewPost and copy it exactly.`,
      };
    }
    if (next.includes(edit.find, first + 1)) {
      return {
        ok: false,
        error: `Edit ${index + 1}: the find text appears more than once. Include more surrounding text so it matches one place.`,
      };
    }
    next = `${next.slice(0, first)}${edit.replace}${next.slice(first + edit.find.length)}`;
  }
  return { ok: true, markdown: next };
}
