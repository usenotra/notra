"use client";

import { AGENT_FEEDBACK_STATUSES } from "@notra/db/constants/agent-feedback";
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
  SheetHeader,
  SheetScrollArea,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";

import { AgentFeedbackAgent } from "@/components/agent-feedback/feedback-agent-icon";
import {
  AgentFeedbackKindBadge,
  AgentFeedbackSentimentLabel,
  AgentFeedbackStatusBadge,
} from "@/components/agent-feedback/feedback-badges";
import { Discussion } from "@/components/comments/discussion";
import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import { useRetainedDetail } from "@/lib/hooks/use-retained-detail";
import type {
  AgentFeedbackDetailDialogProps,
  AgentFeedbackDetailFieldProps,
} from "@/types/agent-feedback";
import { isAgentFeedbackStatus } from "@/utils/agent-feedback";

function DetailField({
  label,
  value,
  children,
  mono = false,
}: AgentFeedbackDetailFieldProps) {
  if (!children && !value) {
    return null;
  }
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 py-1.5">
      <div className="text-muted-foreground pt-0.5 text-xs">{label}</div>
      {children ?? (
        <p
          className={cn(
            mono ? "font-mono text-xs break-all" : "text-sm wrap-anywhere"
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export function AgentFeedbackDetailDialog({
  item: selectedDetail,
  open,
  onOpenChange,
  onStatusChange,
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
          <SheetScrollArea>
            <div className="mx-auto w-full max-w-3xl space-y-6">
              <section className="space-y-2">
                <div className="text-muted-foreground text-xs">
                  {t("labels")}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <AgentFeedbackKindBadge kind={item.kind} />
                    <AgentFeedbackSentimentLabel sentiment={item.sentiment} />
                  </div>
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
                      className="hover:bg-background bg-background h-8 w-auto shrink-0 gap-1.5"
                    >
                      <AgentFeedbackStatusBadge status={item.status} />
                    </SelectTrigger>
                    <SelectContent align="end" alignItemWithTrigger={false}>
                      {AGENT_FEEDBACK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          <AgentFeedbackStatusBadge status={status} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section className="space-y-1.5">
                <div className="text-muted-foreground text-xs">
                  {t("message")}
                </div>
                <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                  {item.message}
                </p>
              </section>

              <section className="divide-y">
                <DetailField label={tCommon("labels.agent")}>
                  <AgentFeedbackAgent
                    className="text-sm"
                    client={item.agentClient}
                  />
                </DetailField>
                <DetailField
                  label={tCommon("labels.model")}
                  value={item.agentModel}
                />
                <DetailField
                  label={t("fields.toolVersion")}
                  value={item.toolVersion}
                />
                <DetailField
                  label={tCommon("labels.source")}
                  value={item.source}
                />
                <DetailField
                  label={t("fields.externalId")}
                  mono
                  value={item.externalId}
                />
                <DetailField
                  label={tCommon("labels.project")}
                  mono
                  value={item.projectId}
                />
                <DetailField
                  label={t("fields.contextUrl")}
                  mono
                  value={item.contextUrl}
                />
                <DetailField
                  label={t("fields.userAgent")}
                  mono
                  value={item.userAgent}
                />
              </section>

              {metadataJson ? (
                <section className="space-y-1.5">
                  <div className="text-muted-foreground text-xs">
                    {t("metadata")}
                  </div>
                  <pre className="bg-muted/40 max-h-64 overflow-auto rounded-md border p-3 font-mono text-xs">
                    {metadataJson}
                  </pre>
                </section>
              ) : null}
              <Discussion
                key={item.id}
                organizationId={item.organizationId}
                targetId={item.id}
                targetType="feedback"
              />
            </div>
          </SheetScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
