"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";

import {
  SITE_PREVIEW_VIEWPORT_HEIGHT,
  SITE_PREVIEW_VIEWPORT_WIDTH,
} from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SitePreviewFrameProps } from "@/types/components/sites";

export function SitePreviewFrame({
  url,
  className,
  fallback,
}: SitePreviewFrameProps) {
  const t = useTranslations("sites.previewFrame");
  const [loaded, setLoaded] = useState(false);
  const [width, setWidth] = useState(0);
  const scale = width > 0 ? width / SITE_PREVIEW_VIEWPORT_WIDTH : 0;

  return (
    <div
      className={cn(
        "bg-muted relative aspect-[16/10] overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10",
        className
      )}
      ref={(node) => {
        if (!node) {
          return;
        }
        const observer = new ResizeObserver(([entry]) => {
          setWidth(entry?.contentRect.width ?? 0);
        });
        observer.observe(node);
        return () => observer.disconnect();
      }}
    >
      {url && scale > 0 ? (
        <iframe
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 left-0 origin-top-left border-0 transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          sandbox="allow-same-origin"
          src={url}
          style={{
            width: SITE_PREVIEW_VIEWPORT_WIDTH,
            height: SITE_PREVIEW_VIEWPORT_HEIGHT,
            transform: `scale(${scale})`,
          }}
          tabIndex={-1}
          title={t("title")}
        />
      ) : null}
      {url && loaded ? null : (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
          {url ? null : (fallback ?? t("unavailable"))}
        </div>
      )}
    </div>
  );
}
