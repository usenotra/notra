import {
  GEO_FAMILY_IMPROVE_SPLIT,
  GEO_FAMILY_IMPROVE_STRONG_RATE,
} from "@notra/geo-core/constants/geo";
import type { GeoEngineFamilyTotals } from "@notra/geo-core/types/geo";

import type {
  FamilyImproveInsight,
  FamilyImproveKind,
  FamilyImproveTranslator,
} from "@/types/geo";
import { formatMentionRate } from "@/utils/geo-charts";

function classifyImproveKind(
  searchRate: number | null,
  memoryRate: number | null
): FamilyImproveKind {
  if (searchRate !== null && memoryRate !== null) {
    if (searchRate - memoryRate >= GEO_FAMILY_IMPROVE_SPLIT) {
      return "search-ahead";
    }
    if (memoryRate - searchRate >= GEO_FAMILY_IMPROVE_SPLIT) {
      return "memory-ahead";
    }
  }

  const peak = Math.max(searchRate ?? 0, memoryRate ?? 0);
  if (peak >= GEO_FAMILY_IMPROVE_STRONG_RATE) {
    return "closing";
  }
  return "both-weak";
}

function insightCopy(
  kind: FamilyImproveKind,
  familyLabel: string,
  searchRate: number | null,
  memoryRate: number | null,
  missed: number,
  t: FamilyImproveTranslator
): Pick<FamilyImproveInsight, "title" | "body"> {
  const search = searchRate === null ? null : formatMentionRate(searchRate);
  const memory = memoryRate === null ? null : formatMentionRate(memoryRate);

  if (kind === "search-ahead" && search && memory) {
    return {
      title: t("searchAhead.title"),
      body: t("searchAhead.body", {
        family: familyLabel,
        search,
        memory,
        count: missed,
      }),
    };
  }

  if (kind === "memory-ahead" && search && memory) {
    return {
      title: t("memoryAhead.title"),
      body: t("memoryAhead.body", {
        family: familyLabel,
        search,
        memory,
        count: missed,
      }),
    };
  }

  if (kind === "closing") {
    return {
      title: t("closing.title", { count: missed }),
      body: t("closing.body", { family: familyLabel }),
    };
  }

  return {
    title: t("bothWeak.title", { count: missed }),
    body: t("bothWeak.body"),
  };
}

export function familyImproveInsight(input: {
  familyLabel: string;
  search: GeoEngineFamilyTotals | null;
  memory: GeoEngineFamilyTotals | null;
  missed: number;
  t: FamilyImproveTranslator;
}): FamilyImproveInsight | null {
  if (input.missed <= 0) {
    return null;
  }

  const searchRate = input.search?.rate ?? null;
  const memoryRate = input.memory?.rate ?? null;
  const kind = classifyImproveKind(searchRate, memoryRate);
  const copy = insightCopy(
    kind,
    input.familyLabel,
    searchRate,
    memoryRate,
    input.missed,
    input.t
  );

  return { kind, ...copy };
}
