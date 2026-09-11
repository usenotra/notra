import type { GeoScanPlanSnapshot } from "@notra/db/types/geo-scan";
import type { z } from "zod";

import type {
  geoScanRunInputSchema,
  geoScanRunsInputSchema,
} from "../schemas/geo-scan-history";

export type GeoScanRunsInput = z.infer<typeof geoScanRunsInputSchema>;
export type GeoScanRunInput = z.infer<typeof geoScanRunInputSchema>;

export interface GeoScanRunSummary {
  id: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  plan: GeoScanPlanSnapshot | null;
  checks: number;
  mentions: number;
}

export interface GeoScanResultSummary {
  id: string;
  prompt: string;
  engine: string;
  mentioned: boolean;
  position: number | null;
  language: string;
  turn: number;
  sequenceId: string | null;
  sources: number;
  capturedAt: string;
}
