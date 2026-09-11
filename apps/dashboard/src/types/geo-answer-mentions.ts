import type {
  GeoAnswerMentionTerm,
  GeoCompetitor,
  GeoCompetitorKind,
} from "@notra/geo-core/types/geo";
import type { ReactNode } from "react";

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
