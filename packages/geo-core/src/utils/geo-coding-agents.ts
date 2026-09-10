import type { GeoBoxRunTarget } from "@notra/ai/types/geo-opencode";

import { GEO_BOX_CODING_AGENT_TARGETS } from "../constants/geo-coding-agents";

export function geoBoxAgentForEngine(engine: string): GeoBoxRunTarget | null {
  return GEO_BOX_CODING_AGENT_TARGETS[engine] ?? null;
}

export function isGeoBoxCodingAgent(engine: string): boolean {
  return geoBoxAgentForEngine(engine) !== null;
}
