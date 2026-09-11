import type { GeoTrafficLogRow } from "@notra/analytics/types/tinybird-endpoints";

import type {
  GeoCompetitor,
  GeoCompetitorRow,
  GeoModelCatalog,
  GeoProject,
  GeoProjectRow,
  GeoPromptRow,
  GeoPromptSequence,
  GeoPromptSequenceRow,
  GeoSettings,
  GeoSettingsRow,
  GeoTrackedPrompt,
  GeoTrafficLogEntry,
} from "../types/geo";
import { toGeoVisitorType } from "../utils/ai-traffic";
import {
  remapRetiredGeoEngineIds,
  resolveTrackedEngines,
} from "../utils/geo-engines";
import { trackedGeoLanguages } from "../utils/geo-language-rows";
import { isGeoScanRunning } from "../utils/geo-scan";

export function toGeoProject(row: GeoProjectRow): GeoProject {
  return {
    id: row.id,
    name: row.name,
    brandSettingsId: row.brandSettingsId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toGeoSettings(
  row: GeoSettingsRow,
  catalog: GeoModelCatalog
): GeoSettings {
  const scanStartedAt = row.scanStartedAt?.toISOString() ?? null;
  const lastScanAt = row.lastScanAt?.toISOString() ?? null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId,
    companyName: row.companyName,
    aliases: row.aliases,
    competitors: row.competitors,
    conversionPaths: row.conversionPaths,
    languages: trackedGeoLanguages(row.languages ?? []),
    engines: resolveTrackedEngines(catalog, row.engines),
    enforceZdr: row.enforceZdr,
    nonZdrApprovedEngines: remapRetiredGeoEngineIds(row.nonZdrApprovedEngines),
    pausedAutoPromptIds: row.pausedAutoPromptIds,
    removedAutoPromptIds: row.removedAutoPromptIds,
    enabled: row.enabled,
    scanIntervalHours: row.scanIntervalHours,
    scanStartedAt,
    lastScanAt,
    isScanning: isGeoScanRunning(row.scanStartedAt, row.lastScanAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toGeoCompetitor(row: GeoCompetitorRow): GeoCompetitor {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    synonyms: row.synonyms,
    kind: row.kind,
    color: row.color,
  };
}

export function toGeoSequence(row: GeoPromptSequenceRow): GeoPromptSequence {
  return {
    id: row.id,
    name: row.name,
    steps: row.steps,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toTrackedPrompt(row: GeoPromptRow): GeoTrackedPrompt {
  return {
    id: row.id,
    prompt: row.prompt,
    enabled: row.enabled,
    source: "custom",
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toGeoTrafficLogEntry(
  row: GeoTrafficLogRow
): GeoTrafficLogEntry {
  return {
    capturedAt: row.captured_at,
    visitorType: toGeoVisitorType(row.visitor_type),
    source: row.source,
    agent: row.agent,
    category: row.category,
    confidence: row.confidence,
    path: row.path,
    host: row.host,
    country: row.country,
    ua: row.ua_snippet,
    journeyId: row.journey_id,
    wantsMarkdown: row.wants_markdown,
  };
}

function toNullableNumber(value: number | bigint | null): number | null {
  if (value === null) {
    return null;
  }
  return Number(value);
}
