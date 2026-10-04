"use client";

import {
  Copy01Icon,
  Delete02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AGENT_FEEDBACK_STATUSES } from "@notra/db/constants/agent-feedback";
import type { AgentFeedbackStatus } from "@notra/db/types/agent-feedback";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@notra/ui/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetScrollArea,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useTranslations } from "use-intl";

import { AgentFeedbackAgent } from "@/components/agent-feedback/feedback-agent-icon";
import {
  AgentFeedbackKindBadge,
  AgentFeedbackSentimentLabel,
  AgentFeedbackStatusBadge,
} from "@/components/agent-feedback/feedback-badges";
import { Button } from "@/components/button";
import { Discussion } from "@/components/comments/discussion";
import { useCopyCode } from "@/components/geo/code-snippet";
import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import { useRetainedDetail } from "@/lib/hooks/use-retained-detail";
import type {
  AgentFeedbackDetailDialogProps,
  AgentFeedbackDetailRow,
  AgentFeedbackItem,
} from "@/types/agent-feedback";
import { isAgentFeedbackStatus } from "@/utils/agent-feedback";
import { paginatedTableHeightFor } from "@/utils/table";

const FEEDBACK_DETAIL_ROW_HEIGHT = 36;

// Long IDs and URLs are truncated to keep rows compact; the copy button keeps
// the full value reachable without hover.
function CopyableValue({ value }: { value: string }) {
  const tCommon = useTranslations("common");
  const { copied, copy } = useCopyCode(value);
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate font-mono text-xs" title={value}>
        {value}
      </span>
      <Button
        aria-label={
          copied ? tCommon("actions.copied") : tCommon("actions.copy")
        }
        onClick={copy}
        size="icon-xs"
        variant="ghost"
      >
        <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} />
      </Button>
    </span>
  );
}

function FeedbackDetailsTable({
  item,
  isUpdating,
  onStatusChange,
}: {
  item: AgentFeedbackItem;
  isUpdating: boolean;
  onStatusChange: (status: AgentFeedbackStatus) => void;
}) {
  const t = useTranslations("feedback.detail");
  const tCommon = useTranslations("common");
  const mono = (value: string | null) =>
    value ? <CopyableValue value={value} /> : null;
  const text = (value: string | null) =>
    value ? (
      <span className="truncate" title={value}>
        {value}
      </span>
    ) : null;

  const rows: AgentFeedbackDetailRow[] = [
    {
      key: "status",
      label: tCommon("labels.status"),
      value: (
        <Select
          disabled={isUpdating}
          onValueChange={(value) => {
            if (value && isAgentFeedbackStatus(value)) {
              onStatusChange(value);
            }
          }}
          value={item.status}
        >
          <SelectTrigger
            aria-label={t("statusLabel")}
            className="-ms-2"
            size="sm"
            variant="ghost"
          >
            <AgentFeedbackStatusBadge status={item.status} />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {AGENT_FEEDBACK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                <AgentFeedbackStatusBadge status={status} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "kind",
      label: tCommon("labels.kind"),
      value: <AgentFeedbackKindBadge kind={item.kind} />,
    },
    {
      key: "sentiment",
      label: tCommon("labels.sentiment"),
      value: <AgentFeedbackSentimentLabel sentiment={item.sentiment} />,
    },
    {
      key: "agent",
      label: tCommon("labels.agent"),
      value: <AgentFeedbackAgent client={item.agentClient} />,
    },
    {
      key: "model",
      label: tCommon("labels.model"),
      value: text(item.agentModel),
    },
    {
      key: "toolVersion",
      label: t("fields.toolVersion"),
      value: text(item.toolVersion),
    },
    {
      key: "source",
      label: tCommon("labels.source"),
      value: text(item.source),
    },
    {
      key: "externalId",
      label: t("fields.externalId"),
      value: mono(item.externalId),
    },
    {
      key: "project",
      label: tCommon("labels.project"),
      value: mono(item.projectId),
    },
    {
      key: "contextUrl",
      label: t("fields.contextUrl"),
      value: mono(item.contextUrl),
    },
    {
      key: "userAgent",
      label: t("fields.userAgent"),
      value: mono(item.userAgent),
    },
  ].filter((row) => row.value !== null);

  const columns: TableColumn<AgentFeedbackDetailRow>[] = [
    {
      key: "label",
      header: t("field"),
      width: "8rem",
      cell: (row) => <span className="text-muted-foreground">{row.label}</span>,
    },
    {
      key: "value",
      header: t("value"),
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center">{row.value}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.key}
      height={paginatedTableHeightFor(rows.length, FEEDBACK_DETAIL_ROW_HEIGHT)}
      rowHeight={FEEDBACK_DETAIL_ROW_HEIGHT}
      scrollFade={false}
    />
  );
}

function FeedbackQuickActions({
  status,
  isUpdating,
  onStatusChange,
}: {
  status: AgentFeedbackStatus;
  isUpdating: boolean;
  onStatusChange: (status: AgentFeedbackStatus) => void;
}) {
  const t = useTranslations("feedback.detail");
  const tCommon = useTranslations("common");

  if (status === "resolved" || status === "archived") {
    return (
      <Button
        disabled={isUpdating}
        onClick={() => onStatusChange("new")}
        size="sm"
        variant="outline"
      >
        {status === "resolved" ? t("reopen") : t("unarchive")}
      </Button>
    );
  }

  return (
    <>
      <Button
        disabled={isUpdating}
        onClick={() => onStatusChange("archived")}
        size="sm"
        variant="outline"
      >
        {tCommon("actions.archive")}
      </Button>
      <Button
        disabled={isUpdating}
        onClick={() => onStatusChange("resolved")}
        size="sm"
      >
        {t("resolve")}
      </Button>
    </>
  );
}

export function AgentFeedbackDetailDialog({
  item: selectedDetail,
  open,
  onOpenChange,
  onStatusChange,
  onDelete,
  isUpdating,
}: AgentFeedbackDetailDialogProps) {
  const t = useTranslations("feedback.detail");
  const tCommon = useTranslations("common");
  const formatRelative = useFormatRelative();
  const item = useRetainedDetail(selectedDetail);
  const metadataJson =
    item?.metadata && Object.keys(item.metadata).length > 0
      ? JSON.stringify(item.metadata, null, 2)
      : null;
  // Short feedback often gets its message reused as the title.
  const showMessage = item ? item.message.trim() !== item.title?.trim() : false;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent variant="inset">
        <SheetHeader className="shrink-0 border-b p-4 pr-14">
          <SheetTitle className="wrap-break-word">
            {item?.title ?? tCommon("labels.feedback")}
          </SheetTitle>
          <SheetDescription>
            {item ? (
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                {t("received", { time: formatRelative(item.createdAt) })}
                {item.agentClient ? (
                  <>
                    <span aria-hidden="true">{t("via")}</span>
                    <AgentFeedbackAgent
                      className="text-muted-foreground"
                      client={item.agentClient}
                    />
                  </>
                ) : null}
              </span>
            ) : (
              t("inspect")
            )}
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <>
            <SheetScrollArea>
              <div className="mx-auto w-full max-w-3xl space-y-6">
                {showMessage ? (
                  <section className="space-y-1.5">
                    <h3 className="text-muted-foreground text-xs">
                      {t("message")}
                    </h3>
                    <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                      {item.message}
                    </p>
                  </section>
                ) : null}

                <FeedbackDetailsTable
                  isUpdating={isUpdating}
                  item={item}
                  onStatusChange={onStatusChange}
                />

                {metadataJson ? (
                  <section className="space-y-1.5">
                    <h3 className="text-muted-foreground text-xs">
                      {t("metadata")}
                    </h3>
                    <pre className="bg-muted/40 max-h-64 overflow-auto rounded-md border p-3 font-mono text-xs">
                      {metadataJson}
                    </pre>
                  </section>
                ) : null}
                <Discussion
                  showEmptyState
                  key={item.id}
                  organizationId={item.organizationId}
                  targetId={item.id}
                  targetType="feedback"
                />
              </div>
            </SheetScrollArea>
            <SheetFooter className="shrink-0 flex-row items-center justify-between border-t p-4">
              <Button
                aria-label={tCommon("actions.delete")}
                onClick={onDelete}
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon icon={Delete02Icon} />
              </Button>
              <div className="flex items-center gap-2">
                <FeedbackQuickActions
                  isUpdating={isUpdating}
                  onStatusChange={onStatusChange}
                  status={item.status}
                />
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
