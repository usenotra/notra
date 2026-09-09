import type { ContentResponse } from "@notra/schemas/dashboard/content";
import type { RefObject } from "react";

import type { ContentDocumentController } from "@/types/content/editor-state";

export interface ContentBrandVoiceSummary {
  id: string;
  name: string;
  websiteUrl: string | null;
  toneProfile: string | null;
  language: string | null;
  companyName: string | null;
}

export interface ContentSourceMetadataProps {
  metadata: unknown;
  voices: ContentBrandVoiceSummary[];
}

export interface RepositoryMetadataProps {
  repositories: { owner: string; repo: string }[];
}

export interface VoiceMetadataProps {
  name: string;
  voice: ContentBrandVoiceSummary | undefined;
}

export interface ImageExportActionsProps {
  content: ContentResponse;
  exportRef: RefObject<HTMLDivElement | null>;
  title: string;
}

export interface ContentDetailToolbarProps {
  content: ContentResponse;
  document: ContentDocumentController;
  isPlanMode: boolean;
  organizationId: string;
  organizationSlug: string;
  voices: ContentBrandVoiceSummary[];
  imageExportRef: RefObject<HTMLDivElement | null>;
}
