import {
  BRAND_KNOWLEDGE_ORIGINS,
  GEO_BRAND_FACT_CATEGORIES,
  type BrandKnowledgeRecord,
} from "../types/geo-accuracy";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBrandKnowledgeRecords(
  value: unknown
): BrandKnowledgeRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const records: BrandKnowledgeRecord[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const statement =
      typeof item.statement === "string" ? item.statement.trim() : "";
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const category = GEO_BRAND_FACT_CATEGORIES.find(
      (entry) => entry === item.category
    );
    if (!statement || !id || !category || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const origin =
      BRAND_KNOWLEDGE_ORIGINS.find((entry) => entry === item.origin) ??
      "manual";
    const sourceUrl =
      typeof item.sourceUrl === "string" ? item.sourceUrl.trim() : "";
    const sourcePath =
      typeof item.sourcePath === "string" ? item.sourcePath.trim() : "";
    records.push({
      id,
      statement,
      category,
      origin,
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(sourcePath ? { sourcePath } : {}),
      ...(item.pinned === true ? { pinned: true } : {}),
    });
  }
  return records;
}
