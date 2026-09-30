"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LOOKBACK_WINDOWS,
  type LookbackWindow,
} from "@notra/schemas/dashboard/integrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";

import { CREATE_CONTENT_FORMAT_ORDER } from "@/constants/content-formats";
import type { FormatsStepProps } from "@/types/content/create";

import { DataPointToggle } from "./data-point-toggle";
import { FormatCard } from "./format-card";

export function StepFormats({
  selected,
  onToggle,
  lookbackWindow,
  onLookbackChange,
  dataPoints,
  onDataPointChange,
  timezone,
}: FormatsStepProps) {
  const t = useTranslations("content.create.stepFormats");
  const tLookback = useTranslations("content.create.lookback");
  const tCommon = useTranslations("common.labels");
  const lookbackLabel = (window: LookbackWindow) =>
    window === "yesterday" ? tCommon("yesterday") : tLookback(window);
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {CREATE_CONTENT_FORMAT_ORDER.map((format) => (
          <FormatCard
            format={format}
            key={format}
            onToggle={() => onToggle(format)}
            selected={selected.includes(format)}
          />
        ))}
      </div>

      <div className="bg-muted/30 space-y-4 rounded-xl border p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium">{t("timeframe")}</p>
              <Tooltip>
                <TooltipTrigger
                  aria-label={t("timezoneInfoLabel")}
                  className="text-muted-foreground hover:text-foreground cursor-help transition-colors"
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-3.5"
                    icon={InformationCircleIcon}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-60">
                  <p>
                    {t.rich("timezoneInfo", {
                      timezone,
                      strong: (chunks) => (
                        <span className="font-medium">{chunks}</span>
                      ),
                    })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("timeframeDescription")}
            </p>
          </div>
          <Select
            onValueChange={(v) => {
              if (v) {
                onLookbackChange(v as LookbackWindow);
              }
            }}
            value={lookbackWindow}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder={t("selectTimeframe")}>
                <span>{lookbackLabel(lookbackWindow)}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LOOKBACK_WINDOWS.map((w) => (
                <SelectItem key={w} value={w}>
                  <span>{lookbackLabel(w)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <DataPointToggle
            checked={dataPoints.includePullRequests}
            description={t("dataPoints.pullRequests.description")}
            label={t("dataPoints.pullRequests.label")}
            onCheckedChange={(v) => onDataPointChange("includePullRequests", v)}
          />
          <DataPointToggle
            checked={dataPoints.includeCommits}
            description={t("dataPoints.commits.description")}
            label={t("dataPoints.commits.label")}
            onCheckedChange={(v) => onDataPointChange("includeCommits", v)}
          />
          <DataPointToggle
            checked={dataPoints.includeReleases}
            description={t("dataPoints.releases.description")}
            label={t("dataPoints.releases.label")}
            onCheckedChange={(v) => onDataPointChange("includeReleases", v)}
          />
        </div>
      </div>
    </div>
  );
}
