"use client";

import { GEO_COMPETITOR_CONTEXT_LIMIT } from "@notra/geo-core/constants/geo";
import type { GeoCompetitor } from "@notra/geo-core/types/geo";
import { useState } from "react";
import { useTranslations } from "use-intl";

import {
  CompetitorChoicesFooter,
  CompetitorChoicesSearch,
} from "@/components/geo/competitor-choices-search";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import {
  GEO_COMPETITOR_CHOICES_MAX_SHOWN,
  GEO_COMPETITOR_CHOICES_SEARCH_THRESHOLD,
} from "@/constants/geo-competitors";
import type { WriteCompetitorChoicesProps } from "@/types/components/geo-writer";
import { visibleCompetitorChoices } from "@/utils/geo-competitors";
import { isWriterCompetitorMentioned } from "@/utils/geo-writer";

import { WriteOptionCard } from "./write-option-card";

export function WriteCompetitorChoices({
  competitors,
  selectedIds,
  mentionedCompetitors,
  onChange,
  children,
}: WriteCompetitorChoicesProps) {
  const t = useTranslations("geo.writer.writeCompetitorChoices");
  const tGeoShared = useTranslations("geo.shared");
  const [query, setQuery] = useState("");
  const competitorDetail = (competitor: GeoCompetitor) => {
    const detail = isWriterCompetitorMentioned(competitor, mentionedCompetitors)
      ? t("mentioned")
      : tGeoShared("tracked");
    return competitor.domain
      ? t("withDomain", { detail, domain: competitor.domain })
      : detail;
  };
  // A brief only positions against so many competitors, so "select all" is
  // offered only while the whole list fits.
  const fitsLimit = competitors.length <= GEO_COMPETITOR_CONTEXT_LIMIT;
  const allSelected =
    competitors.length > 0 && selectedIds.length === competitors.length;
  const atLimit = selectedIds.length >= GEO_COMPETITOR_CONTEXT_LIMIT;
  const selected = new Set(selectedIds);
  const isSearchable =
    competitors.length > GEO_COMPETITOR_CHOICES_SEARCH_THRESHOLD;
  const { visible, hidden } = visibleCompetitorChoices(
    competitors,
    query,
    GEO_COMPETITOR_CHOICES_MAX_SHOWN
  );

  const toggleAll = () => {
    if (allSelected || !fitsLimit) {
      onChange([]);
      return;
    }
    onChange(competitors.map((item) => item.id));
  };

  return (
    <section
      className="scroll-mt-2 space-y-4 px-6 py-6"
      data-section="competitors"
    >
      <div className="flex items-start justify-between gap-3">
        {children}
        {competitors.length > 0 && (fitsLimit || selectedIds.length > 0) ? (
          <button
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-xs transition-colors"
            onClick={toggleAll}
            type="button"
          >
            {allSelected || !fitsLimit
              ? t("clearAll")
              : tGeoShared("selectAll")}
          </button>
        ) : null}
      </div>
      {competitors.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {isSearchable ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="sm:w-64">
                <CompetitorChoicesSearch onChange={setQuery} value={query} />
              </div>
              <p
                className="text-muted-foreground text-xs tabular-nums"
                title={t("limitHint", { max: GEO_COMPETITOR_CONTEXT_LIMIT })}
              >
                {t("selectedCount", {
                  count: selectedIds.length,
                  max: GEO_COMPETITOR_CONTEXT_LIMIT,
                })}
              </p>
            </div>
          ) : null}
          {!fitsLimit && selectedIds.length === 0 ? (
            <p className="text-muted-foreground text-xs text-pretty">
              {t("autoPick", { max: GEO_COMPETITOR_CONTEXT_LIMIT })}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((competitor) => {
              const isSelected = selected.has(competitor.id);
              return (
                <WriteOptionCard
                  compact
                  description={competitorDetail(competitor)}
                  disabled={!isSelected && atLimit}
                  icon={
                    <CompetitorLogo
                      className="size-5"
                      domain={competitor.domain}
                      name={competitor.name}
                    />
                  }
                  key={competitor.id}
                  label={competitor.name}
                  onToggle={() =>
                    onChange(
                      isSelected
                        ? selectedIds.filter((id) => id !== competitor.id)
                        : [...selectedIds, competitor.id]
                    )
                  }
                  selected={isSelected}
                />
              );
            })}
          </div>
          <CompetitorChoicesFooter
            hidden={hidden}
            query={query}
            visibleCount={visible.length}
          />
        </div>
      )}
    </section>
  );
}
