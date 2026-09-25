"use client";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import type { WriteCompetitorChoicesProps } from "@/types/components/geo-writer";
import { writerCompetitorDetail } from "@/utils/geo-writer";

import { WriteOptionCard } from "./write-option-card";

export function WriteCompetitorChoices({
  competitors,
  selectedIds,
  mentionedCompetitors,
  onChange,
  children,
}: WriteCompetitorChoicesProps) {
  const allSelected =
    competitors.length > 0 && selectedIds.length === competitors.length;
  const selected = new Set(selectedIds);

  return (
    <section
      className="scroll-mt-2 space-y-4 px-6 py-6"
      data-section="competitors"
    >
      <div className="flex items-start justify-between gap-3">
        {children}
        {competitors.length > 0 ? (
          <button
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-xs transition-colors"
            onClick={() =>
              onChange(allSelected ? [] : competitors.map((item) => item.id))
            }
            type="button"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        ) : null}
      </div>
      {competitors.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
          No competitors tracked yet. Add them in GEO settings to mention
          alternatives.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <WriteOptionCard
              compact
              description={writerCompetitorDetail(
                competitor,
                mentionedCompetitors
              )}
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
                  selected.has(competitor.id)
                    ? selectedIds.filter((id) => id !== competitor.id)
                    : [...selectedIds, competitor.id]
                )
              }
              selected={selected.has(competitor.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
