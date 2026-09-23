import type { GeoBrandFact } from "@notra/db/types/geo-accuracy";
import type {
  AccuracyAnalysisState,
  AccuracyClaim,
} from "@notra/geo-core/types/accuracy-analysis";

export interface AccuracyTabProps {
  organizationId: string;
  organizationSlug: string;
  isScanning: boolean;
}

export interface AccuracyClaimRow extends AccuracyClaim {
  id: string;
  relatedFacts: GeoBrandFact[];
}

export interface AccuracyClaimsTableProps {
  claims: AccuracyClaim[];
  facts: GeoBrandFact[];
  pending: boolean;
  knowledgeHref: string;
  writerHref: string;
}

export interface AccuracyClaimsEmptyProps {
  title: string;
  message: string;
  canAnalyze: boolean;
  retrying: boolean;
  analyze: () => void;
}

export interface AccuracyClaimsViewInput {
  state?: AccuracyAnalysisState;
  isAnalyzing: boolean;
  isPending: boolean;
  isError: boolean;
}
