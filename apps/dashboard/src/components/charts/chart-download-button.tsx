"use client";

import { Download01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import type { ChartDownloadButtonProps } from "@/types/chart-download";
import {
  buildChartDownloadFilename,
  chartExportSource,
  chartExportTitle,
  downloadChartPng,
} from "@/utils/chart-download";

export function ChartDownloadButton({
  sourceRef,
  title,
  filename,
  className,
}: ChartDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    const source = chartExportSource(sourceRef.current);
    if (!source || isDownloading) {
      return;
    }

    const label = title ?? chartExportTitle(source);

    setIsDownloading(true);
    try {
      await downloadChartPng(
        source,
        label,
        filename ?? buildChartDownloadFilename(label)
      );
      toast.success("Downloaded chart");
    } catch (error) {
      console.error("Failed to download chart", error);
      toast.error("Failed to download chart");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label="Export"
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
      <TooltipContent side="left">Export</TooltipContent>
    </Tooltip>
  );
}
