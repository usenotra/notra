"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DetailCardContent } from "@notra/ui/components/ui/detail-card";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { BrandTrackingBadge } from "@/components/geo/share-of-voice-brand-tag";
import { useGeoCompetitorPromptSummary } from "@/lib/hooks/use-geo";
import type { GeoAnswerMentionCompetitorCardProps } from "@/types/geo-answer-mentions";

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
  const t = useTranslations("geo.geoAnswerMentionCard");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const { data, isLoading } = useGeoCompetitorPromptSummary(
    organizationId,
    open ? brand : null
  );
  const summary = data?.summary ?? null;

  return (
    <DetailCardContent
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
          <MentionStatRow label={tGeoShared("domain")} value={domain} />
        ) : null}
        {kind ? (
          <MentionStatRow
            label={tCommon("labels.type")}
            value={
              kind === "direct" ? tGeoShared("direct") : tGeoShared("indirect")
            }
          />
        ) : null}
        {synonyms.length > 0 ? (
          <MentionStatRow
            label={t("alsoKnownAs")}
            value={synonyms.join(", ")}
          />
        ) : null}
        {isLoading ? (
          <div
            aria-label={t("loadingMentions")}
            className="flex items-center justify-between gap-3 px-3 py-1.5"
            role="status"
          >
            <span className="text-muted-foreground shrink-0">
              {tGeoShared("mentionsLabel")}
            </span>
            <Skeleton className="h-3 w-20" />
          </div>
        ) : null}
        {!isLoading && summary ? (
          <MentionStatRow
            label={tGeoShared("mentionsLabel")}
            value={tGeoShared("countPluralOneAnswerOther", {
              count: summary.answers,
            })}
          />
        ) : null}
        {summary ? (
          <MentionStatRow
            label={tGeoShared("withYourBrand")}
            value={t("withYouValue", {
              own: summary.ownMentioned,
              total: summary.answers,
            })}
          />
        ) : null}
      </dl>
      {showView ? (
        <div className="border-border mt-1 border-t px-1 py-1">
          <button
            className="hover:bg-muted/60 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium"
            onClick={onView}
            type="button"
          >
            {t("viewCompetitor")}
            <HugeiconsIcon
              aria-hidden="true"
              className="text-muted-foreground size-3.5"
              icon={ArrowRight01Icon}
            />
          </button>
        </div>
      ) : null}
    </DetailCardContent>
  );
}
