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

import { CREATE_CONTENT_FORMAT_ORDER } from "@/constants/content-formats";
import type { FormatsStepProps } from "@/types/content/create";
import { formatSnakeCaseLabel } from "@/utils/format";

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
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          What do you want to create?
        </h2>
        <p className="text-muted-foreground text-sm">
          Select one or more content formats. We'll help you craft each one.
        </p>
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
              <p className="text-sm font-medium">Timeframe</p>
              <Tooltip>
                <TooltipTrigger
                  aria-label="Timeframe timezone information"
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
                    Activity is gathered in your timezone (
                    <span className="font-medium">{timezone}</span>). Today and
                    Yesterday follow your local day. Rolling ranges like Last 7
                    Days are identical in every timezone.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground text-xs">
              How far back to look when gathering activity data.
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
              <SelectValue placeholder="Select timeframe">
                <span className="capitalize">
                  {formatSnakeCaseLabel(lookbackWindow)}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LOOKBACK_WINDOWS.map((w) => (
                <SelectItem key={w} value={w}>
                  <span className="capitalize">{formatSnakeCaseLabel(w)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <DataPointToggle
            checked={dataPoints.includePullRequests}
            description="Merged PR metadata"
            label="Pull Requests"
            onCheckedChange={(v) => onDataPointChange("includePullRequests", v)}
          />
          <DataPointToggle
            checked={dataPoints.includeCommits}
            description="Commit-level changes"
            label="Commits"
            onCheckedChange={(v) => onDataPointChange("includeCommits", v)}
          />
          <DataPointToggle
            checked={dataPoints.includeReleases}
            description="GitHub releases"
            label="Releases"
            onCheckedChange={(v) => onDataPointChange("includeReleases", v)}
          />
        </div>
      </div>
    </div>
  );
}
