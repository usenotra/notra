import { useTranslations } from "use-intl";

import type {
  GeoShelfOpportunityStatus,
  GeoShelfPlacementStatus,
  GeoShelfSourceKind,
  GeoShelfTicketFilter,
} from "@/types/geo-shelf";

export function useGeoShelfKindLabels(): Record<GeoShelfSourceKind, string> {
  const t = useTranslations("geo.shelf.labels.kind");
  const tLabels = useTranslations("common.labels");
  const tGeoShared = useTranslations("geo.shared");
  return {
    listicle: tLabels("listicle"),
    review_site: t("review_site"),
    community: t("community"),
    news: t("news"),
    docs: tGeoShared("docs"),
    video: tLabels("video"),
    other: tLabels("otherNeuter"),
  };
}

export function useGeoShelfStatusLabels(): Record<
  GeoShelfOpportunityStatus,
  string
> {
  const t = useTranslations("geo.shelf.labels.status");
  const tGeoShared = useTranslations("geo.shared");
  return {
    open: tGeoShared("open"),
    in_progress: tGeoShared("inProgress"),
    won: tGeoShared("won"),
    lost: tGeoShared("lost"),
    dismissed: t("dismissed"),
  };
}

export function useGeoShelfTicketFilterLabels(): Record<
  GeoShelfTicketFilter,
  string
> {
  const t = useTranslations("geo.shelf.shelfToolbar.ticketFilter");
  const tLabels = useTranslations("common.labels");
  const tGeoShared = useTranslations("geo.shared");
  return {
    any: t("any"),
    open: tGeoShared("open"),
    in_progress: tGeoShared("inProgress"),
    mine: t("mine"),
    unassigned: tLabels("unassigned"),
    closed: t("closed"),
  };
}

export function useGeoShelfPlacementLabels(): Record<
  GeoShelfPlacementStatus,
  string
> {
  const t = useTranslations("geo.shelf.labels.placement");
  const tGeoShared = useTranslations("geo.shared");
  return {
    present: t("present"),
    absent: t("absent"),
    unknown: tGeoShared("notChecked"),
  };
}
