"use client";

import { Download01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import {
  buildChartDownloadFilename,
  chartExportTitle,
  downloadChartPng,
} from "@/utils/chart-download";

function chartRoot(start: EventTarget | null): HTMLElement | null {
  if (!(start instanceof HTMLElement)) {
    return null;
  }
  const root = start.closest("[data-chart]");
  return root instanceof HTMLElement ? root : null;
}

export function ChartDownloadButton({ className }: { className?: string }) {
  const t = useTranslations("charts.download");
  const tCommon = useTranslations("common");
  const [isDownloading, setIsDownloading] = useState(false);

  function handleDownload(event: MouseEvent<HTMLButtonElement>) {
    const source = chartRoot(event.currentTarget);
    if (!source || isDownloading) {
      return;
    }

    const title = chartExportTitle(source);
    setIsDownloading(true);
    void downloadChartPng(source, title, buildChartDownloadFilename(title))
      .then(
        () => {
          toast.success(t("success"));
        },
        (error: unknown) => {
          console.error("Failed to download chart", error);
          toast.error(t("failed"));
        }
      )
      .finally(() => {
        setIsDownloading(false);
      });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={tCommon("actions.export")}
            className={className}
            disabled={isDownloading}
            onClick={handleDownload}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon
          className={isDownloading ? "animate-spin" : undefined}
          icon={isDownloading ? Loading03Icon : Download01Icon}
          size={14}
        />
      </TooltipTrigger>
      <TooltipContent side="left">{tCommon("actions.export")}</TooltipContent>
    </Tooltip>
  );
}
