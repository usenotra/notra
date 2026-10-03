"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Twemoji } from "@/components/geo/twemoji";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { LANGUAGE_FLAGS } from "@/constants/language-flags";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoSettingsLanguageAdd } from "@/lib/hooks/use-geo";
import { useLanguageLabel } from "@/lib/hooks/use-language-label";
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
  const languageLabel = useLanguageLabel();
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
        label={languageLabel(language)}
      />
      <span className={cn("min-w-0 truncate", !muted && "font-medium")}>
        {languageLabel(language)}
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
  const t = useTranslations("geo.languagePerformanceCard");
  const languageLabel = useLanguageLabel();
  const tCommon2 = useTranslations("common");
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
              aria-label={t("addLanguageAria", {
                language: languageLabel(language),
              })}
              className="shrink-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:scale-100"
              onClick={(event) => event.preventDefault()}
              size="sm"
              type="button"
              variant="outline"
            />
          }
        >
          {content}
          {tCommon2("actions.add")}
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          {t("limitTooltip", {
            max: GEO_MAX_LANGUAGES,
            language: languageLabel(language),
          })}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      aria-label={t("addLanguageAria", { language: languageLabel(language) })}
      className="shrink-0"
      disabled={disabled}
      onClick={() => onAdd(language)}
      size="sm"
      type="button"
      variant="outline"
    >
      {content}
      {tCommon2("actions.add")}
    </Button>
  );
}

export function LanguagePerformanceCard({
  points,
  organizationId,
  settings,
}: LanguagePerformanceCardProps) {
  const t = useTranslations("geo.languagePerformanceCard");
  const tCommon2 = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common.actions");
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
      onSuccess: () =>
        toast.success(t("addedToTracking", { language: languageToAdd })),
    });
    setLanguageToAdd(undefined);
  };

  const adding = addLanguage.isPending;
  const columns = useMemo<TableColumn<LanguagePerformanceRow>[]>(
    () => [
      {
        key: "language",
        header: tCommon2("labels.language"),
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
        header: tGeoShared("brandVisibility"),
        width: "1.3fr",
        sortable: true,
        sortValue: (row) =>
          row.kind === "tracked"
            ? (row.visibilityRate ?? row.mentionRate)
            : Number.NEGATIVE_INFINITY,
        cell: (row) =>
          row.kind === "suggested" ? (
            <span className="text-muted-foreground/50 text-xs">
              {t("notTracked")}
            </span>
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
        collapsePriority: 1,
        header: tGeoShared("trendLabel"),
        width: "7.5rem",
        cell: (row) => {
          if (row.kind === "suggested") {
            return (
              <LanguageAddButton
                disabled={adding || atLimit}
                language={row.language}
                limitReached={atLimit}
                onAdd={setLanguageToAdd}
                pending={pendingLanguage === row.language}
              />
            );
          }
          if ((row.trend?.length ?? 0) >= GEO_SPARKLINE_MIN_POINTS) {
            return (
              <GeoRateSparkline
                className="text-geo-search"
                label={t("trendLabel", { language: row.language })}
                points={row.trend ?? []}
              />
            );
          }
          return <span className="text-muted-foreground text-xs">-</span>;
        },
      },
    ],
    [adding, atLimit, pendingLanguage, t]
  );

  return (
    <>
      <InstrumentSection
        bodyClassName="flex min-h-0 flex-1 flex-col"
        className="h-full"
        eyebrow={tGeoShared("performanceByLanguage")}
        hint={t("hint")}
      >
        <DataTable
          columns={columns}
          data={rows}
          defaultSort={{ key: "mentionRate", direction: "desc" }}
          emptyState={t("noResults")}
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
              {t("confirmTitle", { language: languageToAdd ?? "" })}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              {t("confirmDescription", { language: languageToAdd ?? "" })}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>
              {tCommon("cancel")}
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction onClick={handleConfirmAddLanguage}>
              {t("addLanguage")}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
