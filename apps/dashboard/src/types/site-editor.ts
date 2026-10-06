import type { Editor } from "@pierre/diffs/edit";

import type { SiteDiagnostic } from "@/types/sites";

export interface SiteEditorSaveState {
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  error?: string;
}

export type SiteEditorLanguage =
  | "mdx"
  | "markdown"
  | "json"
  | "jsx"
  | "css"
  | "text";

export type SiteEditorMode = "edit" | "changes";

export type SiteDraftChange = "added" | "modified" | "deleted";

export interface SiteFileTreeFile {
  path: string;
  editable: boolean;
  isNew: boolean;
  hasDraft: boolean;
}

export interface SiteEditorJump {
  path: string;
  line: number;
  nonce: number;
}

export interface SiteEditorNewFile {
  path: string;
  content: string;
}

export interface SiteCodeAnnotation {
  severity: SiteDiagnostic["severity"];
  message: string;
}

export type SiteFileEditor = Editor<"file", SiteCodeAnnotation>;

export interface SiteDiffLineCounts {
  additions: number;
  deletions: number;
}
