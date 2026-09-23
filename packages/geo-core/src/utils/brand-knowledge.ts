import type { BrandKnowledgeRecord } from "@notra/db/types/geo-accuracy";

import {
  KNOWLEDGE_EXCLUDED_PATH_PARTS,
  KNOWLEDGE_MAX_RECORDS,
  KNOWLEDGE_PAGE_WEIGHTS,
} from "../constants/brand-knowledge";
import { knowledgeScanOutputSchema } from "../schemas/brand-knowledge";
import type { KnowledgeScanSource } from "../types/brand-knowledge";

export function knowledgeStatementKey(statement: string) {
  return statement.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

export function scoreKnowledgeUrl(url: string, origin: string): number {
  try {
    const parsed = new URL(url);
    const source = new URL(origin);
    const host = parsed.hostname.replace(/^www\./, "");
    const sourceHost = source.hostname.replace(/^www\./, "");
    if (host !== sourceHost) {
      return -1;
    }
    const path = parsed.pathname.endsWith("/")
      ? parsed.pathname
      : `${parsed.pathname}/`;
    if (
      KNOWLEDGE_EXCLUDED_PATH_PARTS.some((part) =>
        path.toLowerCase().includes(part)
      )
    ) {
      return -1;
    }
    return (
      KNOWLEDGE_PAGE_WEIGHTS.find(({ pattern }) => pattern.test(path))
        ?.weight ??
      Math.max(10, 40 - path.split("/").filter(Boolean).length * 8)
    );
  } catch {
    return -1;
  }
}

function knowledgeUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/^www\./, "");
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}

export function pickKnowledgeUrls(
  websiteUrl: string,
  sitemapUrls: readonly string[],
  limit: number
): string[] {
  const ranked = [websiteUrl, ...sitemapUrls]
    .map((url) => ({ url, score: scoreKnowledgeUrl(url, websiteUrl) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const entry of ranked) {
    const key = knowledgeUrlKey(entry.url);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    picked.push(entry.url);
    if (picked.length >= limit) {
      break;
    }
  }
  return picked;
}

export function parseKnowledgeScanOutput(
  output: unknown,
  sources: readonly KnowledgeScanSource[]
): Omit<BrandKnowledgeRecord, "id">[] {
  const parsed = knowledgeScanOutputSchema.parse(output);
  const allowed = new Map(sources.map((source) => [source.url, source.origin]));
  const seen = new Set<string>();
  const facts: Omit<BrandKnowledgeRecord, "id">[] = [];
  for (const fact of parsed.facts) {
    const origin = allowed.get(fact.sourceUrl);
    if (origin !== fact.origin) {
      continue;
    }
    const key = knowledgeStatementKey(fact.statement);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const source = sources.find((entry) => entry.url === fact.sourceUrl);
    facts.push({
      statement: fact.statement,
      category: fact.category,
      origin: fact.origin,
      sourceUrl: fact.sourceUrl,
      ...(source?.path ? { sourcePath: source.path } : {}),
    });
  }
  return facts;
}

export function mergeKnowledgeRecords(
  existing: readonly BrandKnowledgeRecord[],
  extracted: readonly Omit<BrandKnowledgeRecord, "id">[]
): BrandKnowledgeRecord[] {
  const kept = existing.filter(
    (record) => record.pinned || record.origin === "manual"
  );
  const keys = new Set(
    kept.map((record) => knowledgeStatementKey(record.statement))
  );
  const merged = [...kept];
  for (const fact of extracted) {
    const key = knowledgeStatementKey(fact.statement);
    if (keys.has(key) || merged.length >= KNOWLEDGE_MAX_RECORDS) {
      continue;
    }
    keys.add(key);
    merged.push({
      ...fact,
      id: crypto.randomUUID(),
    });
  }
  return merged.slice(0, KNOWLEDGE_MAX_RECORDS);
}
