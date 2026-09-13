"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_LANGUAGE_PERFORMANCE_HINT,
  GEO_MAX_LANGUAGES,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_VISIBILITY_TABLE_ROWS,
} from "@notra/geo-core/constants/geo";
import type { LanguagePerformanceRow } from "@notra/geo-core/types/geo";
import {
  buildLanguagePerformanceRows,
  trackedGeoLanguages,
} from "@notra/geo-core/utils/geo-language-rows";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Twemoji } from "@/components/geo/twemoji";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { LANGUAGE_FLAGS } from "@/constants/language-flags";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoSettingsLanguageAdd } from "@/lib/hooks/use-geo";
import { cn } from "@/lib/utils";
import type { LanguagePerformanceCardProps } from "@/types/geo";
import { formatMentionRate } from "@/utils/geo-charts";
import { GEO_VISIBILITY_TABLE_HEIGHT } from "@/utils/table";

function LanguageNameCell({
  language,
  muted,
}: {
  language: string;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-sm",
        muted && "text-muted-foreground"
      )}
    >
      <Twemoji
        className={cn("size-4 shrink-0", muted && "opacity-40")}
        emoji={LANGUAGE_FLAGS[language as keyof typeof LANGUAGE_FLAGS] ?? ""}
        label={language}
      />
      <span className={cn("min-w-0 truncate", !muted && "font-medium")}>
        {language}
      </span>
    </span>
  );
}

function LanguageAddButton({
  language,
  disabled,
  limitReached,
  pending,
  onAdd,
}: {
  language: string;
  disabled: boolean;
  limitReached: boolean;
  pending: boolean;
  onAdd: (language: string) => void;
}) {
  const content = pending ? (
    <StatusSpinner />
  ) : (
    <HugeiconsIcon className="size-3.5" icon={PlusSignIcon} />
  );

  if (limitReached) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-disabled="true"
              aria-label={`Add ${language}`}
              className="shrink-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:scale-100"
              onClick={(event) => event.preventDefault()}
              size="sm"
              type="button"
              variant="outline"
            />
          }
        >
          {content}
          Add
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          You can track up to {GEO_MAX_LANGUAGES} additional languages. Remove
          one in Languages to add {language}.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      aria-label={`Add ${language}`}
      className="shrink-0"
      disabled={disabled}
      onClick={() => onAdd(language)}
      size="sm"
      type="button"
      variant="outline"
    >
      {content}
      Add
    </Button>
  );
}

function languagePerformanceColumns({
  adding,
  atLimit,
  pendingLanguage,
  onAddLanguage,
}: {
  adding: boolean;
  atLimit: boolean;
  pendingLanguage: string | undefined;
  onAddLanguage: (language: string) => void;
}): TableColumn<LanguagePerformanceRow>[] {
  return [
    {
      key: "language",
      header: "Language",
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <LanguageNameCell
          language={row.language}
          muted={row.kind === "suggested"}
        />
      ),
    },
    {
      key: "mentionRate",
      header: "Brand visibility",
      width: "1.3fr",
      sortable: true,
      sortValue: (row) =>
        row.kind === "tracked"
          ? (row.visibilityRate ?? row.mentionRate)
          : Number.NEGATIVE_INFINITY,
      cell: (row) =>
        row.kind === "suggested" ? (
          <span className="text-muted-foreground/50 text-xs">Not tracked</span>
        ) : (
          <span className="flex items-center gap-2">
            <GeoBar
              className="h-2 max-w-40"
              fillClassName="bg-geo-search"
              value={row.visibilityRate ?? row.mentionRate}
            />
            <span className="shrink-0 text-xs tabular-nums">
              {formatMentionRate(row.visibilityRate ?? row.mentionRate)}
            </span>
          </span>
        ),
    },
    {
      key: "trend",
      header: "Trend",
      width: "7.5rem",
      cell: (row) => {
        if (row.kind === "suggested") {
          return (
            <LanguageAddButton
              disabled={adding || atLimit}
              language={row.language}
              limitReached={atLimit}
              onAdd={onAddLanguage}
              pending={pendingLanguage === row.language}
            />
          );
        }
        if ((row.trend?.length ?? 0) >= GEO_SPARKLINE_MIN_POINTS) {
          return (
            <GeoRateSparkline
              className="text-geo-search"
              label={`${row.language} mention rate trend`}
              points={row.trend ?? []}
            />
          );
        }
        return <span className="text-muted-foreground text-xs">-</span>;
      },
    },
  ];
}

export function LanguagePerformanceCard({
  points,
  organizationId,
  settings,
}: LanguagePerformanceCardProps) {
  const [languageToAdd, setLanguageToAdd] = useState<string>();
  const addLanguage = useGeoSettingsLanguageAdd(organizationId);
  const savedExtras = trackedGeoLanguages(settings.languages);
  const pendingLanguage = addLanguage.isPending
    ? addLanguage.variables
    : undefined;
  const configuredLanguages =
    pendingLanguage !== undefined
      ? trackedGeoLanguages([...savedExtras, pendingLanguage])
      : savedExtras;
  const atLimit = configuredLanguages.length >= GEO_MAX_LANGUAGES;

  const rows = buildLanguagePerformanceRows({
    configuredLanguages,
    points,
    slotCount: GEO_VISIBILITY_TABLE_ROWS,
  });

  const handleConfirmAddLanguage = () => {
    if (!languageToAdd) {
      return;
    }
    addLanguage.mutate(languageToAdd, {
      onSuccess: () => toast.success(`${languageToAdd} added to tracking`),
    });
    setLanguageToAdd(undefined);
  };

  const columns = useMemo(
    () =>
      languagePerformanceColumns({
        adding: addLanguage.isPending,
        atLimit,
        onAddLanguage: setLanguageToAdd,
        pendingLanguage,
      }),
    [addLanguage.isPending, atLimit, pendingLanguage]
  );

  return (
    <>
      <InstrumentSection
        bodyClassName="flex min-h-0 flex-1 flex-col"
        className="h-full"
        eyebrow="Performance by language"
        hint={GEO_LANGUAGE_PERFORMANCE_HINT}
      >
        <Table
          className="rounded-2xl"
          columns={columns}
          data={rows}
          defaultSort={{ key: "mentionRate", direction: "desc" }}
          emptyState="No language results yet"
          getRowId={(row) => `${row.kind}:${row.language}`}
          height={GEO_VISIBILITY_TABLE_HEIGHT}
          minHeight={GEO_VISIBILITY_TABLE_HEIGHT}
          resizable
          rowHeight={TABLE_ROW_HEIGHT}
        />
      </InstrumentSection>
      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setLanguageToAdd(undefined);
          }
        }}
        open={Boolean(languageToAdd)}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Add {languageToAdd}?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This will run the same prompts in {languageToAdd} so you can track
              performance in this language.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction onClick={handleConfirmAddLanguage}>
              Add language
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
