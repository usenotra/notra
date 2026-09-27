"use client";

import { useTranslations } from "next-intl";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { Checkbox } from "@/components/motion/checkbox";
import type { GeoShelfPresenceFieldsProps } from "@/types/geo-shelf";

export function ShelfPresenceFields({
  id,
  ownBrandName,
  competitors,
  ownPresent,
  presentCompetitorIds,
  onOwnPresentChange,
  onPresentCompetitorIdsChange,
}: GeoShelfPresenceFieldsProps) {
  const t = useTranslations("geo.shelf.shelfPresenceFields");
  const tGeoShared = useTranslations("geo.shared");
  const ownLabel = ownBrandName || tGeoShared("youLabel");
  const presentCompetitorIdSet = new Set(presentCompetitorIds);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("legend")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="hover:bg-muted/40 flex items-center gap-2.5 rounded-lg border px-3 py-2">
          <Checkbox
            aria-label={t("isOnPage", { name: ownLabel })}
            checked={ownPresent}
            id={`${id}-own-present`}
            onCheckedChange={onOwnPresentChange}
          />
          <label
            className="min-w-0 flex-1 cursor-pointer truncate text-sm font-medium"
            htmlFor={`${id}-own-present`}
          >
            {ownLabel}
            <span className="text-muted-foreground ml-1 font-normal">
              {tGeoShared("you")}
            </span>
          </label>
        </div>
        {competitors.map((competitor) => {
          const checked = presentCompetitorIdSet.has(competitor.id);
          const checkboxId = `${id}-competitor-${competitor.id}`;
          return (
            <div
              className="hover:bg-muted/40 flex items-center gap-2.5 rounded-lg border px-3 py-2"
              key={competitor.id}
            >
              <Checkbox
                aria-label={t("isOnPage", { name: competitor.name })}
                checked={checked}
                id={checkboxId}
                onCheckedChange={(next) =>
                  onPresentCompetitorIdsChange(
                    next
                      ? [...presentCompetitorIds, competitor.id]
                      : presentCompetitorIds.filter(
                          (value) => value !== competitor.id
                        )
                  )
                }
              />
              <label
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                htmlFor={checkboxId}
              >
                <CompetitorLogo
                  className="size-5 shrink-0 rounded-md"
                  domain={competitor.domain}
                  name={competitor.name}
                />
                <span className="truncate text-sm font-medium">
                  {competitor.name}
                </span>
              </label>
            </div>
          );
        })}
      </div>
      {competitors.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("noCompetitors")}</p>
      ) : null}
    </fieldset>
  );
}
