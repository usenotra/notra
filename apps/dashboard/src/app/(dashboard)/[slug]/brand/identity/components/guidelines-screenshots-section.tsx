"use client";

import { ComputerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ImageZoom } from "@notra/ui/components/kibo-ui/image-zoom";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

import type { GuidelinesScreenshotsSectionProps } from "@/types/brand-identity";
import type { BrandGuidelineScreenshot } from "@/types/hooks/brand-guidelines";
import { joinMeta } from "@/utils/brand-guideline-display";

import { GuidelinesResourceActions } from "./guidelines-resource-actions";
import { GuidelinesScreenshotEditDialog } from "./guidelines-screenshot-edit-dialog";

interface ScreenshotSlice {
  format?: string;
  height?: number;
  index?: number;
  scrollOffset?: number;
  url?: string;
  width?: number;
}

interface ScreenshotMetadata {
  scrollOffset?: number;
  slices?: ScreenshotSlice[];
}

interface DisplayScreenshot {
  editTarget: BrandGuidelineScreenshot;
  format: string;
  fullPage: boolean;
  height: number;
  id: string;
  kind: BrandGuidelineScreenshot["kind"];
  label: string;
  scrollOffset: number | null;
  url: string;
  width: number;
}

function getScreenshotMetadata(screenshot: BrandGuidelineScreenshot) {
  if (typeof screenshot.metadata === "object" && screenshot.metadata !== null) {
    return screenshot.metadata as ScreenshotMetadata;
  }

  return {};
}

function getScrollOffset(screenshot: BrandGuidelineScreenshot) {
  const { scrollOffset } = getScreenshotMetadata(screenshot);
  return typeof scrollOffset === "number" ? scrollOffset : null;
}

function getDisplayScreenshots(
  screenshots: BrandGuidelineScreenshot[],
  t: ReturnType<typeof useTranslations<"brand.guidelines">>
): DisplayScreenshot[] {
  return screenshots.flatMap((screenshot) => {
    const slices = getScreenshotMetadata(screenshot).slices?.filter(
      (
        slice
      ): slice is Required<Pick<ScreenshotSlice, "url">> & ScreenshotSlice =>
        typeof slice.url === "string" && slice.url.length > 0
    );

    if (!slices || slices.length <= 1) {
      return [
        {
          editTarget: screenshot,
          format: screenshot.format,
          fullPage: screenshot.fullPage,
          height: screenshot.height,
          id: screenshot.id,
          kind: screenshot.kind,
          label: t(`screenshotKinds.${screenshot.kind}`),
          scrollOffset: getScrollOffset(screenshot),
          url: screenshot.url,
          width: screenshot.width,
        },
      ];
    }

    return slices.map((slice, index) => ({
      editTarget: screenshot,
      format: slice.format ?? screenshot.format,
      fullPage: false,
      height: slice.height ?? screenshot.height,
      id: `${screenshot.id}:${slice.scrollOffset ?? index}`,
      kind: screenshot.kind,
      label: t("screenshots.desktopSlice", { index: index + 1 }),
      scrollOffset:
        typeof slice.scrollOffset === "number" ? slice.scrollOffset : null,
      url: slice.url,
      width: slice.width ?? screenshot.width,
    }));
  });
}

export function GuidelinesScreenshotsSection({
  screenshots,
  organizationId,
  voiceId,
}: GuidelinesScreenshotsSectionProps) {
  const [editing, setEditing] = useState<BrandGuidelineScreenshot | null>(null);
  const t = useTranslations("brand.guidelines");
  const displayScreenshots = getDisplayScreenshots(screenshots, t);

  if (displayScreenshots.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={ComputerIcon}
        />
        <h2 className="text-sm font-semibold">{t("screenshots.title")}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {displayScreenshots.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayScreenshots.map((screenshot) => {
          const meta = joinMeta([
            `${screenshot.width}×${screenshot.height}`,
            screenshot.format.toUpperCase(),
            screenshot.fullPage ? t("screenshots.fullPage") : null,
          ]);

          return (
            <div
              className="flex flex-col overflow-hidden rounded-xl border"
              key={screenshot.id}
            >
              <div className="bg-muted/40 p-2 text-center">
                <ImageZoom className="inline-block max-w-full" zoomMargin={24}>
                  <Image
                    alt={screenshot.label}
                    className="block h-auto max-h-48 w-auto max-w-full object-contain"
                    height={screenshot.height}
                    src={screenshot.url}
                    width={screenshot.width}
                  />
                </ImageZoom>
              </div>

              <div className="flex items-center justify-between gap-2 border-t p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {screenshot.label}
                  </p>
                  <p className="text-muted-foreground truncate text-xs tabular-nums">
                    {meta}
                  </p>
                </div>

                <GuidelinesResourceActions
                  label={screenshot.label}
                  onEdit={() => setEditing(screenshot.editTarget)}
                  url={screenshot.url}
                />
              </div>
            </div>
          );
        })}
      </div>

      {editing ? (
        <GuidelinesScreenshotEditDialog
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
            }
          }}
          open
          organizationId={organizationId}
          screenshot={editing}
          voiceId={voiceId}
        />
      ) : null}
    </section>
  );
}
