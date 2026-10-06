"use client";

import { GEO_PROMPT_MENTIONED_INSTEAD_VISIBLE } from "@notra/geo-core/constants/geo";
import type { GeoCompetitor } from "@notra/geo-core/types/geo";
import { DetailCardContent } from "@notra/ui/components/ui/detail-card";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { useTranslations } from "use-intl";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import type { GeoPromptBrandCount } from "@/types/geo";

/**
 * Who the engines named instead of you on one prompt: the top brands with
 * their logos, the full ranking with answer counts on hover.
 */
export function PromptMentionedInsteadCell({
  brands,
  answers,
  competitors,
}: {
  brands: readonly GeoPromptBrandCount[];
  /** Answers the counts are out of. */
  answers: number;
  competitors: readonly GeoCompetitor[] | undefined;
}) {
  const t = useTranslations("geo.promptsTable");
  const tGeoShared = useTranslations("geo.shared");
  if (brands.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const visible = brands.slice(0, GEO_PROMPT_MENTIONED_INSTEAD_VISIBLE);
  const hiddenCount = brands.length - visible.length;

  return (
    <HoverCard>
      <HoverCardTrigger
        aria-label={brands.map((brand) => brand.name).join(", ")}
        render={
          <span className="flex min-w-0 cursor-default items-center gap-3" />
        }
      >
        {visible.map((brand) => (
          <span className="flex min-w-0 items-center gap-1.5" key={brand.name}>
            <CompetitorLogo
              className="size-4 rounded-sm"
              competitors={competitors}
              name={brand.name}
            />
            <span className="min-w-0 truncate">{brand.name}</span>
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span className="text-muted-foreground shrink-0 tabular-nums">
            +{hiddenCount}
          </span>
        ) : null}
      </HoverCardTrigger>
      <DetailCardContent
        aside={tGeoShared("countPluralOneAnswerOther", { count: answers })}
        title={t("columns.mentionedInstead")}
      >
        <ul className="flex flex-col">
          {brands.map((brand) => (
            <li
              className="flex items-center gap-2 px-3 py-1.5 text-sm"
              key={brand.name}
            >
              <CompetitorLogo
                className="size-4 rounded-sm"
                competitors={competitors}
                name={brand.name}
              />
              <span className="min-w-0 flex-1 truncate">{brand.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {brand.count}/{answers}
              </span>
            </li>
          ))}
        </ul>
      </DetailCardContent>
    </HoverCard>
  );
}
