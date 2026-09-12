import type { GeoContentSubtype } from "@notra/ai/types/geo-writer";
import type {
  GeoContentBriefDetail,
  GeoContentBriefSummary,
  GeoWriterSourceKind,
} from "@notra/geo-core/types/geo";
import type { ReactNode } from "react";

import type { GeoWriteDialogEntry } from "@/types/analytics/geo-events";
import type { Sitemap } from "@/types/hooks/brand-sitemaps";

export interface BriefHistoryProps {
  briefs: GeoContentBriefSummary[];
  activeBriefId?: string;
  onOpen: (briefId: string) => void;
  onHover?: (briefId: string) => void;
}

export interface GeoWriterNeedsSetupProps {
  organizationId: string;
  title: string;
  description: string;
}

export type WriteDialogSectionId =
  | "prompt"
  | "type"
  | "brand"
  | "sitemap"
  | "competitors";

export interface WriteSitemapSectionProps {
  organizationId: string;
  brandVoiceId: string | null;
  voiceName: string | null;
  voiceWebsiteUrl: string | null;
  brandIdentityHref: string;
  sitemaps: Sitemap[];
  isPending: boolean;
  selectedSitemapId: string | null;
  onSelect: (sitemapId: string) => void;
}

export interface WriteBrandOptionProps {
  name: string;
  websiteUrl: string | null;
  isDefault: boolean;
}

export interface WriteOptionCardProps {
  icon: ReactNode;
  label: string;
  description?: string | null;
  selected: boolean;
  onToggle: () => void;
  compact?: boolean;
  badge?: string | null;
}

export interface WriteDialogBaseline {
  mentionedEngines: number;
  totalEngines: number;
}

export interface WriteFormatRecommendation {
  id: GeoContentSubtype;
  reason: string;
}

export type WriteDialogSourceKind = GeoWriterSourceKind;

export interface WriteDialogInitialState {
  sourceKind: WriteDialogSourceKind;
  sourceId?: string;
  topic?: string;
  contentSubtype?: GeoContentSubtype;
  brandVoiceId?: string;
  competitorIds?: string[];
  baseline?: WriteDialogBaseline | null;
  mentionedCompetitors?: string[];
  existingPageUrl?: string;
}

export interface WriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationSlug: string;
  initial?: WriteDialogInitialState | null;
  entry?: GeoWriteDialogEntry;
}

/** Input for opening WriteDialog from a GEO gap row. */
export interface GeoGapsWriteEntry {
  promptId: string;
  prompt: string;
  mentionedEngines?: readonly string[];
  missingEngines?: readonly string[];
  mentionedCompetitors?: readonly string[];
}

export interface WriterExecuteRootProps {
  organizationId: string;
  briefId: string | null;
  hasUnsavedChanges: boolean;
  onArticleReady: () => void | Promise<void>;
  children: ReactNode;
}

export interface WriterExecuteState {
  status: GeoContentBriefDetail["status"] | undefined;
  error: string | null;
  isStarting: boolean;
  isBusy: boolean;
  isPending: boolean;
  hasUnsavedChanges: boolean;
}

export interface WriterExecuteActions {
  execute: () => void;
}

export interface WriteSectionSidebarProps {
  activeSection: WriteDialogSectionId;
  collapsed: boolean;
  onJump: (section: WriteDialogSectionId) => void;
}
