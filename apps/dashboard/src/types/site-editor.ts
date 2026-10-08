import type { Editor } from "@pierre/diffs/edit";

import type { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteDiagnostic } from "@/types/sites";

export interface SiteEditorSaveState {
  status: "idle" | "dirty" | "saving" | "saved" | "error" | "discarding";
  error?: string;
}

export type SiteEditorDraftInput = Parameters<
  typeof dashboardOrpc.sites.editor.saveDraft.call
>[0];
export type SiteEditorDraftResult = Awaited<
  ReturnType<typeof dashboardOrpc.sites.editor.saveDraft.call>
>;

export type SiteEditorDraftReference = Pick<
  SiteEditorDraftInput,
  "draftId" | "draftRevision" | "sourceContext"
>;

export interface SiteEditorSaveSnapshot {
  content: string | null;
  state: SiteEditorSaveState;
  revision: number;
}

export interface SiteEditorSaveQueueOptions {
  save: (input: SiteEditorDraftInput) => Promise<SiteEditorDraftResult>;
  discard: (input: SiteEditorDraftReference) => Promise<void>;
  onSaved: (input: SiteEditorDraftInput, result: SiteEditorDraftResult) => void;
  onDiscarded: () => Promise<void>;
  onStateChange: (state: SiteEditorSaveState) => void;
  errorMessage: (error: unknown) => string;
}

export interface SiteEditorSaveQueue {
  getSnapshot: () => SiteEditorSaveSnapshot;
  subscribe: (listener: () => void) => () => void;
  edit: (input: SiteEditorDraftInput) => void;
  flush: () => Promise<void>;
  discard: (input: SiteEditorDraftReference) => Promise<void>;
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
