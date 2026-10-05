"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { useGeoCompetitorEngineMatrix } from "@/lib/hooks/use-geo";
import { cn } from "@/lib/utils";
import type { CompetitorEngineMatrixCardProps } from "@/types/geo";
import { formatUsageShare } from "@/utils/geo-charts";
import {
  buildEngineMatrix,
  engineMatrixTint,
  engineMatrixUsesLightText,
} from "@/utils/geo-engine-matrix";

function MatrixCell({
  rate,
  minRate,
  maxRate,
  noChecksLabel,
}: {
  rate: number | null;
  minRate: number;
  maxRate: number;
  noChecksLabel: string;
}) {
  if (rate === null) {
    return (
      <span className="bg-muted/60 text-muted-foreground flex h-10 items-center justify-center rounded-lg text-sm">
        <span aria-hidden="true">–</span>
        <span className="sr-only">{noChecksLabel}</span>
      </span>
    );
  }
  const tint = engineMatrixTint(rate, minRate, maxRate);
  return (
    <span
      className={cn(
        "flex h-10 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_var(--matrix-tint),var(--muted))] text-sm tabular-nums",
        engineMatrixUsesLightText(tint)
          ? "text-primary-foreground"
          : "text-foreground"
      )}
      style={{ "--matrix-tint": `${tint}%` } as CSSProperties}
    >
      {formatUsageShare(rate)}
    </span>
  );
}

export function CompetitorEngineMatrixCard({
  organizationId,
  range,
  companyName,
  aliases,
  competitors,
  trackedEngines,
  isScanning = false,
}: CompetitorEngineMatrixCardProps) {
  const t = useTranslations("geo.competitorEngineMatrix");
  const { data, isPending } = useGeoCompetitorEngineMatrix(
    organizationId,
    range
  );

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  const matrix = buildEngineMatrix(data, {
    companyName,
    aliases,
    competitors,
    trackedEngines,
  });
  const isEmpty = matrix.columns.length === 0 || matrix.rows.length === 0;

  return (
    <InstrumentModule
      bodyClassName="p-2"
      eyebrow={t("title")}
      hint={t("hint")}
      variant="table"
    >
      {isEmpty ? (
        <InstrumentEmpty
          busy={isScanning}
          message={isScanning ? t("scanning") : t("empty")}
          seed="competitor-engine-matrix"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1">
            <caption className="sr-only">{t("tableLabel")}</caption>
            <thead>
              <tr>
                <th className="w-48 min-w-40" scope="col">
                  <span className="sr-only">{t("brandColumn")}</span>
                </th>
                {matrix.columns.map((column) => (
                  <th
                    className="min-w-20 px-1 pt-1 pb-2 text-xs font-medium"
                    key={column.family}
                    scope="col"
                  >
                    <span className="flex flex-col items-center gap-2">
                      <span className="bg-background ring-border flex size-7 items-center justify-center rounded-md ring-1">
                        <EngineIcon className="size-4" engine={column.engine} />
                      </span>
                      <span className="truncate">{column.label}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.own ? "own" : row.brand}>
                  <th
                    className={cn(
                      "rounded-lg px-2 text-left text-sm font-normal",
                      row.own && "bg-primary/10 font-medium"
                    )}
                    scope="row"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CompetitorLogo
                        competitors={competitors}
                        name={row.brand}
                      />
                      <span className="truncate">{row.brand}</span>
                      {row.own ? (
                        <span className="text-muted-foreground shrink-0 text-xs font-normal">
                          {t("you")}
                        </span>
                      ) : null}
                    </span>
                  </th>
                  {row.rates.map((rate, index) => (
                    <td
                      className="p-0"
                      key={matrix.columns[index]?.family ?? index}
                    >
                      <MatrixCell
                        maxRate={matrix.maxRate}
                        minRate={matrix.minRate}
                        noChecksLabel={t("noChecks")}
                        rate={rate}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </InstrumentModule>
  );
}
