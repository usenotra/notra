import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import type { ReactNode } from "react";

import type { ContentDocumentController } from "@/types/content/editor-state";

export interface UseContentPlanOptions {
  organizationId: string;
  contentId: string;
  sourceMetadata: unknown;
  replacePersistedMarkdown: ContentDocumentController["replacePersistedMarkdown"];
  resetForArticle: ContentDocumentController["resetForArticle"];
}

export interface ContentDetailPlanProps {
  brief: GeoContentBrief | undefined;
  briefId: string | undefined;
  contentId: string;
  editorVersion: number;
  hasConflict: boolean;
  isReviewable: boolean;
  isWriting: boolean;
  onBriefChange: (brief: GeoContentBrief) => void;
  onDirtyChange: (dirty: boolean) => void;
  onLoadLatest: () => Promise<void>;
  onSaveVersion: () => Promise<void>;
}

export interface ContentDetailDocumentProps {
  editor: ReactNode;
  isPlanMode: boolean;
  plan: ContentDetailPlanProps;
}
