export type ImportKind = "content" | "component";

export type ResolvedImport =
  | { ok: true; path: string; kind: ImportKind }
  | { ok: false; message: string };

export interface LineColumn {
  line: number;
  column: number;
}
