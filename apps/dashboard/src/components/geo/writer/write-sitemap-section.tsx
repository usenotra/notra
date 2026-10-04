"use client";

import { GlobalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_WRITE_SITEMAP_SKELETON_KEYS } from "@notra/geo-core/constants/geo";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { type KeyboardEvent, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import Link from "@/components/framework/link";
import { useCreateSitemap } from "@/lib/hooks/use-brand-sitemaps";
import {
  getRegistrableHost,
  isUrlWithinBrandHost,
  normalizeSitemapUrl,
} from "@/lib/sitemap/sitemap-url";
import type { WriteSitemapSectionProps } from "@/types/components/geo-writer";

import { WriteOptionCard } from "./write-option-card";

export function WriteSitemapSection({
  organizationId,
  brandVoiceId,
  voiceName,
  voiceWebsiteUrl,
  brandIdentityHref,
  sitemaps,
  isPending,
  selectedSitemapId,
  onSelect,
}: WriteSitemapSectionProps) {
  const t = useTranslations("geo.writer.writeSitemapSection");
  const tCommon = useTranslations("common");
  const [url, setUrl] = useState("");
  const createSitemap = useCreateSitemap(organizationId, brandVoiceId ?? "");

  if (!brandVoiceId) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
        {t("needsBrand")}
      </p>
    );
  }

  const ownerName = voiceName ?? t("thisBrandIdentity");
  const ownerLine = (
    <p className="text-muted-foreground text-sm">
      {t.rich("ownerLine", {
        name: ownerName,
        strong: (chunks) => (
          <span className="text-foreground font-medium">{chunks}</span>
        ),
        link: (chunks) => (
          <Link
            className="text-foreground font-medium underline underline-offset-2"
            href={brandIdentityHref}
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
  const sitemapSummary = (status: string, indexedPages: number) => {
    if (status === "failed") {
      return t("crawlFailed");
    }
    if (status === "ready") {
      return t("pagesIndexed", { count: indexedPages });
    }
    return t("crawling");
  };

  if (isPending) {
    return (
      <div className="space-y-3">
        {ownerLine}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GEO_WRITE_SITEMAP_SKELETON_KEYS.map((key) => (
            <Skeleton className="h-12 rounded-lg" key={key} />
          ))}
        </div>
      </div>
    );
  }

  const brandHost = getRegistrableHost(voiceWebsiteUrl ?? "");
  const trimmedUrl = url.trim();
  const isOffHost =
    trimmedUrl.length > 0 && !isUrlWithinBrandHost(trimmedUrl, voiceWebsiteUrl);
  const canAdd =
    trimmedUrl.length > 0 && !isOffHost && !createSitemap.isPending;

  const handleAdd = async () => {
    if (!canAdd) {
      return;
    }
    try {
      const sitemap = await createSitemap.mutateAsync({
        url: normalizeSitemapUrl(trimmedUrl),
      });
      setUrl("");
      onSelect(sitemap.id);
      toast.success(tCommon("labels.sitemapAdded"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tCommon("labels.failedToAddSitemap")
      );
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd().catch(() => undefined);
    }
  };

  return (
    <div className="space-y-3">
      {ownerLine}
      {sitemaps.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sitemaps.map((sitemap) => (
            <WriteOptionCard
              compact
              description={sitemapSummary(sitemap.status, sitemap.indexedPages)}
              icon={
                <HugeiconsIcon
                  className="text-muted-foreground size-5"
                  icon={GlobalIcon}
                  strokeWidth={1.8}
                />
              }
              key={sitemap.id}
              label={sitemap.label}
              onToggle={() => onSelect(sitemap.id)}
              selected={sitemap.id === selectedSitemapId}
            />
          ))}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            aria-invalid={isOffHost}
            aria-label={tCommon("labels.sitemapOrSiteUrl")}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              brandHost
                ? `https://${brandHost}/sitemap.xml`
                : "https://example.com/sitemap.xml"
            }
            value={url}
          />
          <Button
            disabled={!canAdd}
            loading={createSitemap.isPending}
            onClick={() => {
              handleAdd().catch(() => undefined);
            }}
            variant="outline"
          >
            {sitemaps.length > 0 ? t("addAnother") : t("addSitemap")}
          </Button>
        </div>
        {isOffHost ? (
          <p className="text-destructive text-xs">
            {brandHost
              ? tCommon("messages.urlsMustStayOnHost", { host: brandHost })
              : tCommon("messages.setAWebsiteOnThis")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
