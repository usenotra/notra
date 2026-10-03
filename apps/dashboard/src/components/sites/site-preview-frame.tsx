"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

/** Rendered width of the page inside the thumbnail; the frame scales it down to fit. */
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

/**
 * A live, non-interactive thumbnail of a deployed page (Vercel/Mintlify style).
 * The page renders at desktop width and is scaled to the frame with CSS.
 */
export function SitePreviewFrame({
  url,
  className,
  fallback,
}: {
  url: string | null;
  className?: string;
  /** Shown instead of "Preview unavailable" when there is no URL, e.g. while the first build runs. */
  fallback?: ReactNode;
}) {
  const t = useTranslations("sites.previewFrame");
  const [loaded, setLoaded] = useState(false);
  const [width, setWidth] = useState(0);
  const scale = width > 0 ? width / VIEWPORT_WIDTH : 0;

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
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
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
