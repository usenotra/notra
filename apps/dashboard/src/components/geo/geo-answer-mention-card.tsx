"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { BrandTrackingBadge } from "@/components/geo/share-of-voice-brand-tag";
import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import {
  GEO_ANSWER_MENTION_ALSO_KNOWN_AS,
  GEO_ANSWER_MENTION_BEST_POSITION_LABEL,
  GEO_ANSWER_MENTION_DOMAIN_LABEL,
  GEO_ANSWER_MENTION_KIND_LABEL,
  GEO_ANSWER_MENTION_MENTIONS_LABEL,
  GEO_ANSWER_MENTION_VIEW_COMPETITOR,
} from "@/constants/geo-answer-mentions";
import { useGeoCompetitorDetail } from "@/lib/hooks/use-geo";
import type { GeoAnswerMentionCompetitorCardProps } from "@/types/geo-answer-mentions";
import {
  competitorPromptSummary,
  formatCompetitorKind,
} from "@/utils/geo-competitors";

function MentionStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}

export function GeoAnswerMentionCompetitorCard({
  brand,
  domain,
  kind,
  synonyms,
  tracked,
  organizationId,
  open,
  showView,
  onView,
}: GeoAnswerMentionCompetitorCardProps) {
  const { data } = useGeoCompetitorDetail(organizationId, open ? brand : null);
  const summary =
    data?.prompts && data.prompts.length > 0
      ? competitorPromptSummary(data.prompts)
      : null;

  return (
    <TrafficBreakdownCard
      align="start"
      aside={<BrandTrackingBadge tracked={tracked} />}
      icon={
        <CompetitorLogo
          className="size-4 rounded-sm"
          domain={domain}
          name={brand}
        />
      }
      title={brand}
    >
      <dl className="text-xs">
        {domain ? (
          <MentionStatRow
            label={GEO_ANSWER_MENTION_DOMAIN_LABEL}
            value={domain}
          />
        ) : null}
        {kind ? (
          <MentionStatRow
            label={GEO_ANSWER_MENTION_KIND_LABEL}
            value={formatCompetitorKind(kind)}
          />
        ) : null}
        {synonyms.length > 0 ? (
          <MentionStatRow
            label={GEO_ANSWER_MENTION_ALSO_KNOWN_AS}
            value={synonyms.join(", ")}
          />
        ) : null}
        {summary ? (
          <MentionStatRow
            label={GEO_ANSWER_MENTION_MENTIONS_LABEL}
            value={`${summary.mentioned.toLocaleString()} of ${summary.total.toLocaleString()}`}
          />
        ) : null}
        {summary?.bestPosition === null || summary === null ? null : (
          <MentionStatRow
            label={GEO_ANSWER_MENTION_BEST_POSITION_LABEL}
            value={`#${summary.bestPosition.toLocaleString()}`}
          />
        )}
      </dl>
      {showView ? (
        <div className="border-border mt-1 border-t px-1 py-1">
          <button
            className="hover:bg-muted/60 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium"
            onClick={onView}
            type="button"
          >
            {GEO_ANSWER_MENTION_VIEW_COMPETITOR}
            <HugeiconsIcon
              aria-hidden="true"
              className="text-muted-foreground size-3.5"
              icon={ArrowRight01Icon}
            />
          </button>
        </div>
      ) : null}
    </TrafficBreakdownCard>
  );
}
