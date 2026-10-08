import type { SiteServingState } from "@notra/sites-core/types/deployment";

export interface InitialServingStateParams {
  siteId: string;
  slug: string;
  now: Date;
}

export interface ProductionPointerInput {
  deploymentId: string;
  generation: number;
}

export type ProductionActivationResult =
  | { outcome: "activated"; state: SiteServingState }
  | { outcome: "already_active"; state: SiteServingState }
  | { outcome: "superseded"; activeGeneration: number };

export type PreviewActivationResult =
  | { outcome: "activated"; state: SiteServingState }
  | { outcome: "superseded"; activeSequence: number };
