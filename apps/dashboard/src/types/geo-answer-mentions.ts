import type {
  GeoAnswerMentionKind,
  GeoAnswerMentionTerm,
  GeoCompetitor,
  GeoCompetitorKind,
} from "@notra/geo-core/types/geo";
import type { ComponentType, ReactNode } from "react";

export interface GeoAnswerMentionContextValue {
  terms: readonly GeoAnswerMentionTerm[];
  competitors: readonly GeoCompetitor[];
  organizationId: string;
  organizationSlug: string;
}

export interface GeoAnswerMentionProviderProps {
  terms: readonly GeoAnswerMentionTerm[];
  competitors?: readonly GeoCompetitor[];
  organizationId?: string;
  organizationSlug?: string;
  children: ReactNode;
}

export interface GeoAnswerMentionMarkProps {
  kind: GeoAnswerMentionKind;
  phrase: string;
  children: ReactNode;
}

export type GeoAnswerMentionComponents = {
  p: ComponentType;
  li: ComponentType;
  td: ComponentType;
  th: ComponentType;
  h1: ComponentType;
  h2: ComponentType;
  h3: ComponentType;
  h4: ComponentType;
  h5: ComponentType;
  h6: ComponentType;
  blockquote: ComponentType;
};

export interface GeoAnswerMentionCompetitorCardProps {
  brand: string;
  domain: string | null;
  kind: GeoCompetitorKind | null;
  synonyms: readonly string[];
  tracked: boolean;
  organizationId: string;
  open: boolean;
  showView: boolean;
  onView: () => void;
}
