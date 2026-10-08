import type { ReactNode } from "react";

type FeatureEngine = "chatgpt" | "claude" | "gemini" | "perplexity";

type FeatureRank = number | null;

interface FeatureDetailFact {
  title: string;
  description: string;
}

interface FeatureDetailMeta {
  path: string;
  title: string;
  description: string;
  ogImageKey: "personas" | "conversations" | "aiCrawlerLogs" | "features";
}

export interface FeatureDetailCopy {
  meta: FeatureDetailMeta;
  heroSubtitle: string;
  signupSource: string;
  overview: {
    heading: string;
    description: string;
    facts: FeatureDetailFact[];
  };
  steps: {
    heading: string;
    items: FeatureDetailFact[];
  };
  cta: {
    heading: string;
    subcopy: string;
  };
}

export interface FeatureDetailPageProps {
  copy: FeatureDetailCopy;
  title: ReactNode;
  stage: ReactNode;
  overviewVisual?: ReactNode;
  overviewVisualFirst?: boolean;
  children?: ReactNode;
}

export interface FeaturePersona {
  name: string;
  role: string;
  avatar: string;
}

export interface FeaturePersonaCard extends FeaturePersona {
  remembers: string;
  rank: FeatureRank;
}

export interface FeaturePersonaVisibilityRow extends FeaturePersona {
  ranks: Record<FeatureEngine, FeatureRank>;
  visibility: string;
}

export interface FeatureConversationTurn {
  question: string;
  searched: string;
  answer: string;
  rank: FeatureRank;
}

export interface FeatureConversationEngineRow extends FeatureEngineLabel {
  ranks: FeatureRank[];
  mentioned: string;
  muted?: boolean;
}

export type FeatureCrawlerReason =
  | "Training"
  | "Search index"
  | "Live answer"
  | "Referral";

export interface FeatureCrawlerReasonTotal {
  reason: FeatureCrawlerReason;
  count: string;
  share: number;
}

export interface FeatureCrawlerPageRow {
  path: string;
  counts: [string | null, string | null, string | null];
  lastVisit: string;
}

export interface FeatureEngineIconProps {
  engine: FeatureEngine;
  className?: string;
  adaptive?: boolean;
}

export interface FeatureRankBadgeProps {
  rank: FeatureRank;
  size?: "sm" | "md";
}

export interface FeatureEngineLabel {
  engine: FeatureEngine;
  label: string;
}

interface FeatureStageImageCredit {
  author: string;
  authorUrl: string;
  photoUrl: string;
}

export interface FeatureStageShellProps {
  className?: string;
  children: ReactNode;
  image?: string;
  credit?: FeatureStageImageCredit | null;
}

export interface FeatureTableCardProps {
  title: string;
  meta: string;
  minWidthClass: string;
  columns: ReactNode;
  head: ReactNode;
  children: ReactNode;
}

export interface PersonasHeadlineWordProps {
  value: string;
  animated: boolean;
  morph: boolean;
}
