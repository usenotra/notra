export interface PostTextEdit {
  find: string;
  replace: string;
}

export type PostTextEditResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string };
