"use client";

import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { InstrumentModule } from "@/components/instrument/instrument-module";
import {
  GEO_SENTIMENT_EMPTY_LABEL_KEYS,
  SENTIMENT_PREVIEW_BARS,
  SENTIMENT_PREVIEW_ENGINE_SHARES,
} from "@/constants/geo-sentiment";
import { cn } from "@/lib/utils";
import type { SentimentBreakdownPlaceholderProps } from "@/types/geo-sentiment";

const FADE_MASK =
  "[mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)]";

function MixPreview({ busy }: { busy: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none flex h-full min-h-64 items-end gap-1 select-none",
        busy ? "opacity-70" : "opacity-40",
        FADE_MASK
      )}
    >
      {SENTIMENT_PREVIEW_BARS.map(({ id, positive, negative }, index) => (
        <div
          className={cn(
            "flex h-full flex-1 flex-col justify-end gap-0.5",
            busy && "sentiment-scan-bar"
          )}
          key={id}
          style={{ "--scan-index": index } as CSSProperties}
        >
          <span
            className="bg-geo-down/20 w-full rounded-[2px]"
            style={{ height: `${negative}%` }}
          />
          <span
            className="bg-muted-foreground/15 w-full rounded-[2px]"
            style={{ height: `${100 - positive - negative}%` }}
          />
          <span
            className="bg-geo-up/25 w-full rounded-[2px]"
            style={{ height: `${positive}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function EnginePreview({ busy }: { busy: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex flex-col divide-y select-none", FADE_MASK)}
    >
      {SENTIMENT_PREVIEW_ENGINE_SHARES.map((share, index) => (
        <div className="flex flex-col gap-2.5 px-5 py-3.5" key={share}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 animate-none" />
            <Skeleton className="h-4 w-6 animate-none" />
          </div>
          <div className="bg-muted overflow-hidden rounded-full">
            <div
              className={cn(
                "flex h-1.5 gap-0.5",
                busy && "sentiment-scan-fill"
              )}
              style={{ "--scan-index": index } as CSSProperties}
            >
              <span
                className="bg-geo-up/25 h-full"
                style={{ width: `${share}%` }}
              />
              <span className="bg-muted-foreground/15 h-full flex-1" />
              {index % 2 === 0 ? (
                <span className="bg-geo-down/20 h-full w-[4%]" />
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SentimentBreakdownPlaceholder({
  state,
  emptyKey,
  isScanning,
  retry,
}: SentimentBreakdownPlaceholderProps) {
  const t = useTranslations("geo.sentimentBreakdown");
  const tGeoShared = useTranslations("geo.shared");
  const tSkeleton = useTranslations("geo.sentimentSkeleton");
  const tScore = useTranslations("geo.brandSentimentCard");
  const busy = state === "pending" || (state === "empty" && isScanning);

  let title = t("empty.title");
  let body = tGeoShared(GEO_SENTIMENT_EMPTY_LABEL_KEYS[emptyKey]);
  if (state === "error") {
    title = t("error.title");
    body = t("error.body");
  } else if (busy) {
    title = t("empty.scanningTitle");
    body = tGeoShared("scanInProgress");
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 @min-[44rem]/main:grid-cols-12">
      <InstrumentModule
        bodyClassName="relative flex min-h-0 flex-1 flex-col p-5"
        className="h-full @min-[44rem]/main:col-span-7"
        eyebrow={t("eyebrow")}
        hint={tScore("scoreHint")}
        variant="table"
      >
        <MixPreview busy={busy} />
        <div
          aria-busy={busy}
          aria-label={state === "pending" ? tSkeleton("loading") : undefined}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
          role={state === "error" ? "alert" : "status"}
        >
          <h3 className="text-base font-medium text-balance">
            {busy ? <Shimmer as="span">{title}</Shimmer> : title}
          </h3>
          <p className="text-muted-foreground max-w-xs text-sm text-balance">
            {body}
          </p>
          {state === "error" ? (
            <Button onClick={retry} size="sm" variant="outline">
              {t("error.retry")}
            </Button>
          ) : null}
        </div>
      </InstrumentModule>
      <InstrumentModule
        bodyClassName="p-0"
        className="h-full @min-[44rem]/main:col-span-5"
        eyebrow={t("byEngine")}
        variant="table"
      >
        <EnginePreview busy={busy} />
      </InstrumentModule>
    </div>
  );
}
