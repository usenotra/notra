import type { useSiteEditorSaves } from "../../src/lib/hooks/use-site-editor-saves";

export interface SiteEditorQueueHarnessProps {
  onReady: (saves: ReturnType<typeof useSiteEditorSaves>) => void;
}

export interface DefaultEditorDraft {
  path: string;
  content: string;
  deleted: boolean;
  baseBlobSha: string | null;
  baseCommitSha: string | null;
  updatedAt: Date;
}

export interface DefaultEditorSaveDraftInput {
  content: string;
  baseBlobSha: string | null;
  baseCommitSha: string | null;
}
