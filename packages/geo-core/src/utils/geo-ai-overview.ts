import {
  GEO_AI_OVERVIEW_INVALID_ENVELOPE,
  GEO_AI_OVERVIEW_INVALID_OVERVIEW,
  GEO_AI_OVERVIEW_INVALID_SHAPE,
} from "../constants/geo-ai-overview";
import type {
  GeoAiOverviewParse,
  GeoAiOverviewSource,
} from "../types/geo-ai-overview";
import { getReferenceDomain } from "./reference-display";

const MAX_BLOCK_DEPTH = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectLine(lines: string[], value: unknown): void {
  const line = readString(value);
  if (line.length > 0) {
    lines.push(line);
  }
}

function flattenListItem(item: unknown, lines: string[], depth: number): void {
  if (!isRecord(item)) {
    return;
  }
  collectLine(lines, item.title);
  collectLine(lines, item.snippet);
  if (Array.isArray(item.list)) {
    flattenBlocks(item.list, lines, depth + 1);
  }
  if (Array.isArray(item.text_blocks)) {
    flattenBlocks(item.text_blocks, lines, depth + 1);
  }
}

function flattenBlocks(
  blocks: readonly unknown[],
  lines: string[],
  depth: number
): void {
  if (depth > MAX_BLOCK_DEPTH) {
    return;
  }
  for (const block of blocks) {
    if (!isRecord(block)) {
      continue;
    }
    collectLine(lines, block.title);
    collectLine(lines, block.snippet);
    collectLine(lines, block.subtitle);
    if (Array.isArray(block.list)) {
      for (const item of block.list) {
        flattenListItem(item, lines, depth);
      }
    }
    if (Array.isArray(block.text_blocks)) {
      flattenBlocks(block.text_blocks, lines, depth + 1);
    }
  }
}

function parseSources(value: unknown): GeoAiOverviewSource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const sources: GeoAiOverviewSource[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const url = readString(item.link ?? item.url);
    const domain = getReferenceDomain(url);
    if (!domain || seen.has(url)) {
      continue;
    }
    seen.add(url);
    const title = readString(item.title) || domain;
    sources.push({ title, url, domain });
  }
  return sources;
}

const SERPAPI_SUCCESS_STATUSES = new Set(["Success", "Cached"]);

function isSuccessEnvelope(payload: Record<string, unknown>): boolean {
  const metadata = payload.search_metadata;
  if (!isRecord(metadata)) {
    return false;
  }
  return SERPAPI_SUCCESS_STATUSES.has(readString(metadata.status));
}

function isRecognizedOverview(overview: Record<string, unknown>): boolean {
  if ("page_token" in overview || "snippet" in overview) {
    return true;
  }
  if ("text_blocks" in overview) {
    return Array.isArray(overview.text_blocks);
  }
  if ("references" in overview) {
    return Array.isArray(overview.references);
  }
  return false;
}

/**
 * Pull the AI Overview text and its citations out of a SerpApi Google payload.
 * Organic results, knowledge graph, and related searches are ignored.
 *
 * A missing `ai_overview` on a successful envelope is a real miss. Anything
 * else that is not a recognized overview shape is invalid so the scan can
 * record an engine error instead of a not-mentioned check.
 */
export function parseGoogleAiOverview(payload: unknown): GeoAiOverviewParse {
  if (!isRecord(payload) || !isSuccessEnvelope(payload)) {
    return { status: "invalid", reason: GEO_AI_OVERVIEW_INVALID_ENVELOPE };
  }
  if (!("ai_overview" in payload) || payload.ai_overview == null) {
    return { status: "absent", pageToken: null };
  }
  const overview = payload.ai_overview;
  if (!isRecord(overview)) {
    return { status: "invalid", reason: GEO_AI_OVERVIEW_INVALID_OVERVIEW };
  }
  if ("text_blocks" in overview && !Array.isArray(overview.text_blocks)) {
    return { status: "invalid", reason: GEO_AI_OVERVIEW_INVALID_OVERVIEW };
  }
  if ("references" in overview && !Array.isArray(overview.references)) {
    return { status: "invalid", reason: GEO_AI_OVERVIEW_INVALID_OVERVIEW };
  }
  if (!isRecognizedOverview(overview)) {
    return { status: "invalid", reason: GEO_AI_OVERVIEW_INVALID_SHAPE };
  }

  const pageToken = readString(overview.page_token) || null;
  const lines: string[] = [];
  collectLine(lines, overview.snippet);
  if (Array.isArray(overview.text_blocks)) {
    flattenBlocks(overview.text_blocks, lines, 0);
  }

  const text = lines.join("\n");
  if (text.length > 0) {
    return {
      status: "present",
      text,
      sources: parseSources(overview.references),
    };
  }
  return { status: "absent", pageToken };
}

export function serpApiErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  const error = readString(payload.error);
  return error.length > 0 ? error : null;
}
