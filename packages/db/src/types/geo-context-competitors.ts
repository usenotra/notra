export interface GeoContextCompetitor {
  id: string;
  name: string;
  domain: string | null;
  kind: "direct" | "indirect";
}

export interface GeoContextCompetitorOptions {
  /** Only rank these competitors (e.g. the ones picked in the writer). */
  ids?: readonly string[];
  /** Names that rank first, e.g. brands named in the evidence for a prompt. */
  preferNames?: readonly string[];
  limit?: number;
}

export interface GeoContextCompetitorSelection {
  competitors: GeoContextCompetitor[];
  /** Tracked competitors in scope before the cut. */
  total: number;
}
