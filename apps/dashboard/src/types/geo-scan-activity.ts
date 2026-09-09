import type {
  GeoScanResultSummary,
  GeoScanRunSummary,
} from "@notra/geo-core/types/geo-scan-history";
import type { ReactNode } from "react";

import type { useGeoScanRun } from "@/lib/hooks/use-geo-scan-history";

export interface GeoScanActivityProps {
  organizationId: string;
}

export interface GeoScanRequest {
  engines: string[];
  prompt?: { id: string; prompt: string };
}

export interface GeoScanControls {
  prepare: (request: GeoScanRequest) => void;
}

export interface GeoScanControlsProviderProps {
  organizationId: string;
  promptCount?: number;
  children: ReactNode;
}

export interface GeoScanModelMenuProps {
  disabledReason?: string;
  engines: readonly string[];
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  primary?: boolean;
  onContinue: (engines: string[]) => void;
}

export interface GeoScanRunDetailProps {
  organizationId: string;
  run: GeoScanRunSummary;
}

export interface GeoScanRunSummaryProps {
  run: GeoScanRunSummary;
  updatedAt: number;
}

export interface GeoScanAnswerProps {
  scanId: string;
  initialLanguage?: string;
  organizationId: string;
  checkId: string | null;
  onClose: () => void;
}

export interface GeoScanResultsListProps {
  footer?: ReactNode;
  results: GeoScanResultSummary[];
  onSelect: (checkId: string) => void;
}

export interface GeoScanResultsProps {
  onPendingPageChange: (offset: number) => void;
  footer?: ReactNode;
  query: ReturnType<typeof useGeoScanRun>;
  running: boolean;
  onSelect: (checkId: string) => void;
}
