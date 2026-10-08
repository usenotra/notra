"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useFormatter, useTranslations } from "use-intl";

import {
  AGENT_READINESS_CHANGE_ICONS,
  AGENT_READINESS_CHANGE_ROW_ORDER,
  AGENT_READINESS_CHANGE_TONE_CLASSES,
  AGENT_READINESS_CHANGES_DEFAULT_SORT,
} from "@/constants/agent-readiness";
import { GEO_CHANGE_ICON_SIZE } from "@/constants/geo-change-icons";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  AgentReadinessChangeCellProps,
  AgentReadinessChangeRow,
  AgentReadinessChangesCardProps,
  AgentReadinessResultLabelProps,
} from "@/types/agent-readiness";
import { tableHeightFor } from "@/utils/table";

const RESULT_ARROW_SIZE = 12;

function useResultLabel() {
  const t = useTranslations("geo.agentReadiness");
  const tCommon = useTranslations("common");
  return (result: AgentReadinessResultLabelProps["result"]) => {
    if (result === null) {
      return t("changes.passing");
    }
    return result === "failed"
      ? tCommon("labels.failed")
      : t("checklist.partial");
  };
}

function ChangeCell({ row }: AgentReadinessChangeCellProps) {
  const t = useTranslations("geo.agentReadiness.changes");
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center",
          AGENT_READINESS_CHANGE_TONE_CLASSES[row.kind]
        )}
      >
        <HugeiconsIcon
          icon={AGENT_READINESS_CHANGE_ICONS[row.kind]}
          size={GEO_CHANGE_ICON_SIZE}
        />
      </span>
      <span className="truncate font-medium">
        {row.kind === "resolved" ? t("fixed") : t(row.kind)}
      </span>
    </span>
  );
}

function ResultCell({ row }: AgentReadinessChangeCellProps) {
  const label = useResultLabel();
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground">
        {label(row.check.previousResult)}
      </span>
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground/60 shrink-0"
        icon={ArrowRight01Icon}
        size={RESULT_ARROW_SIZE}
      />
      <span>{label(row.check.result)}</span>
    </span>
  );
}

export function AgentReadinessChangesCard({
  comparison,
}: AgentReadinessChangesCardProps) {
  const t = useTranslations("geo.agentReadiness");
  const format = useFormatter();
  const rows: AgentReadinessChangeRow[] = comparison
    ? AGENT_READINESS_CHANGE_ROW_ORDER.flatMap((kind) =>
        comparison[kind].map((check) => ({ kind, check }))
      )
    : [];
  const columns: TableColumn<AgentReadinessChangeRow>[] = [
    {
      key: "change",
      header: t("changes.columns.change"),
      width: "11rem",
      sortable: true,
      cell: (row) => <ChangeCell row={row} />,
      sortValue: (row) => AGENT_READINESS_CHANGE_ROW_ORDER.indexOf(row.kind),
    },
    {
      key: "check",
      header: t("changes.columns.check"),
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="text-sm">
          {row.check.name}
        </TruncateWithTooltip>
      ),
      sortValue: (row) => row.check.name,
    },
    {
      key: "priority",
      collapsePriority: 1,
      header: t("changes.columns.priority"),
      width: "9rem",
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.check.tier === "essential"
            ? t("groups.mustDoLabel")
            : t("groups.shouldDoLabel")}
        </span>
      ),
    },
    {
      key: "result",
      collapsePriority: 2,
      header: t("changes.columns.result"),
      width: "12rem",
      cell: (row) => <ResultCell row={row} />,
    },
  ];

  return (
    <InstrumentSection
      description={
        comparison
          ? t("changes.subline", {
              date: format.dateTime(new Date(comparison.previousScannedAt), {
                month: "short",
                day: "numeric",
              }),
            })
          : undefined
      }
      eyebrow={t("changes.eyebrow")}
    >
      {rows.length > 0 ? (
        <DataTable
          columns={columns}
          data={rows}
          defaultSort={AGENT_READINESS_CHANGES_DEFAULT_SORT}
          getRowId={(row) => `${row.kind}-${row.check.id}`}
          height={tableHeightFor(rows.length)}
          rowHeight={TABLE_ROW_HEIGHT}
        />
      ) : (
        <InstrumentEmpty
          className="h-40 min-h-40 rounded-2xl border"
          message={comparison ? t("changes.noChanges") : t("changes.empty")}
        />
      )}
    </InstrumentSection>
  );
}
