"use client";

import { useTranslations } from "use-intl";

import { SitePreviewFrame } from "@/components/sites/site-preview-frame";
import type { SiteOverviewPreviewProps } from "@/types/components/sites";

export function SiteOverviewPreview({
  url,
  suspended,
  firstBuild,
  live,
}: SiteOverviewPreviewProps) {
  const t = useTranslations("sites.overviewPage");

  let fallback: string | null = null;
  if (suspended) {
    fallback = t("previewOffline");
  } else if (firstBuild) {
    fallback = t("previewBuilding");
  } else if (!live) {
    fallback = t("previewNothingLive");
  }

  const preview = (
    <SitePreviewFrame className="rounded-lg" fallback={fallback} url={url} />
  );
  if (!url) {
    return preview;
  }
  return (
    <a
      aria-hidden="true"
      className="block min-w-0 rounded-lg transition-opacity duration-150 hover:opacity-90"
      href={url}
      rel="noopener noreferrer"
      tabIndex={-1}
      target="_blank"
    >
      {preview}
    </a>
  );
}
