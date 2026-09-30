"use client";

import {
  Alert02Icon,
  AlertCircleIcon,
  Copy01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AgentReadinessIssueGroups } from "@notra/geo-core/types/agent-readiness";
import {
  buildAgentReadinessAllFixesPrompt,
  buildAgentReadinessFixPrompt,
  groupAgentReadinessIssues,
} from "@notra/geo-core/utils/agent-readiness";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { useCopyCode } from "@/components/geo/code-snippet";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import { AGENT_READINESS_FIX_COPY_KINDS } from "@/constants/geo-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import type {
  AgentReadinessChecklistProps,
  AgentReadinessChecklistPromptActionsProps,
  AgentReadinessCopyPromptButtonProps,
  AgentReadinessIssueEntryProps,
  AgentReadinessResultBadgeProps,
  AgentReadinessSectionHeaderProps,
} from "@/types/agent-readiness";

function CopyPromptButton({
  prompt,
  label,
  copyKind,
  checkId,
  variant = "outline",
  size = "sm",
}: AgentReadinessCopyPromptButtonProps) {
  const tCommon = useTranslations("common");
  const { copied, copy } = useCopyCode(prompt);

  return (
    <Button
      className="shrink-0"
      onClick={() => {
        trackEvent(POSTHOG_EVENTS.AGENT_READINESS_FIX_COPIED, {
          check_id: checkId ?? null,
          kind: copyKind,
        });
        return copy();
      }}
      size={size}
      type="button"
      variant={variant}
    >
      <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
      {copied ? tCommon("actions.copied") : label}
    </Button>
  );
}

function ResultBadge({ result }: AgentReadinessResultBadgeProps) {
  const t = useTranslations("geo.agentReadiness.checklist");
  const tCommon = useTranslations("common");

  if (result === "failed") {
    return <Badge variant="destructive">{tCommon("labels.failed")}</Badge>;
  }

  return <Badge variant="warning">{t("partial")}</Badge>;
}

function formatIssueIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function buildFullBacklogPrompt(
  targetUrl: string,
  groups: AgentReadinessIssueGroups
): string {
  return buildAgentReadinessAllFixesPrompt(targetUrl, [
    ...groups.mustDo,
    ...groups.shouldDo,
  ]);
}

function ChecklistPromptActions({
  targetUrl,
  groups,
}: AgentReadinessChecklistPromptActionsProps) {
  const t = useTranslations("geo.agentReadiness.checklist");
  const hasMustDo = groups.mustDo.length > 0;
  const hasShouldDo = groups.shouldDo.length > 0;
  const masterPrompt = buildAgentReadinessAllFixesPrompt(
    targetUrl,
    hasMustDo ? groups.mustDo : groups.shouldDo
  );

  return (
    <>
      <CopyPromptButton
        copyKind={AGENT_READINESS_FIX_COPY_KINDS.MASTER}
        label={t("copyMasterPrompt")}
        prompt={masterPrompt}
        variant="default"
      />
      {hasMustDo && hasShouldDo ? (
        <CopyPromptButton
          copyKind={AGENT_READINESS_FIX_COPY_KINDS.BACKLOG}
          label={t("copyFullBacklog")}
          prompt={buildFullBacklogPrompt(targetUrl, groups)}
        />
      ) : null}
    </>
  );
}

function IssueEntry({
  issue,
  index,
  targetUrl,
}: AgentReadinessIssueEntryProps) {
  const t = useTranslations("geo.agentReadiness.checklist");
  const fixPrompt = buildAgentReadinessFixPrompt(targetUrl, issue);

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-b py-5 last:border-b-0">
      <span className="text-muted-foreground pt-0.5 text-sm tabular-nums">
        {formatIssueIndex(index)}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{issue.name}</h3>
          <ResultBadge result={issue.result} />
        </div>
        {issue.details ? (
          <p className="text-muted-foreground mt-1.5 text-sm">
            {issue.details}
          </p>
        ) : null}
        {issue.recommendation ? (
          <div className="mt-3 overflow-hidden rounded-lg border">
            <div className="bg-muted/40 flex items-center justify-between gap-2 border-b py-1 pr-1 pl-3">
              <span className="text-muted-foreground text-xs font-medium">
                {t("suggestedFix")}
              </span>
              <CopyPromptButton
                checkId={issue.id}
                copyKind={AGENT_READINESS_FIX_COPY_KINDS.FIX}
                label={t("copyFix")}
                prompt={fixPrompt}
                size="xs"
                variant="ghost"
              />
            </div>
            <p className="text-muted-foreground px-3 py-2.5 text-sm">
              {issue.recommendation}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <CopyPromptButton
              checkId={issue.id}
              copyKind={AGENT_READINESS_FIX_COPY_KINDS.FIX}
              label={t("copyFix")}
              prompt={fixPrompt}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function SectionHeader({
  icon,
  iconClassName,
  label,
  hint,
  count,
}: AgentReadinessSectionHeaderProps) {
  return (
    <div className="pb-2">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <HugeiconsIcon
          className={iconClassName}
          icon={icon}
          size={16}
          strokeWidth={2}
        />
        {label}
        <span className="text-muted-foreground bg-muted rounded-full px-1.5 py-px text-xs font-medium tabular-nums">
          {count}
        </span>
      </span>
      <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
    </div>
  );
}

export function AgentReadinessChecklist({
  targetUrl,
  issues,
}: AgentReadinessChecklistProps) {
  const t = useTranslations("geo.agentReadiness");
  const groups = groupAgentReadinessIssues(issues);
  const hasFixableIssues =
    groups.mustDo.length > 0 || groups.shouldDo.length > 0;

  return (
    <InstrumentModule
      action={
        hasFixableIssues ? (
          <ChecklistPromptActions groups={groups} targetUrl={targetUrl} />
        ) : undefined
      }
      bodyClassName="gap-0 px-5 pb-2"
      eyebrow={t("checklist.eyebrow")}
      variant="table"
    >
      {groups.mustDo.length > 0 ? (
        <section className="pt-6 first:pt-1">
          <SectionHeader
            count={groups.mustDo.length}
            hint={t("groups.mustDoHint")}
            icon={AlertCircleIcon}
            iconClassName="text-destructive"
            label={t("groups.mustDoLabel")}
          />
          <div>
            {groups.mustDo.map((issue, index) => (
              <IssueEntry
                index={index}
                issue={issue}
                key={issue.id}
                targetUrl={targetUrl}
              />
            ))}
          </div>
        </section>
      ) : null}
      {groups.shouldDo.length > 0 ? (
        <section className="pt-6 first:pt-1">
          <SectionHeader
            count={groups.shouldDo.length}
            hint={t("groups.shouldDoHint")}
            icon={Alert02Icon}
            iconClassName="text-warning"
            label={t("groups.shouldDoLabel")}
          />
          <div>
            {groups.shouldDo.map((issue, index) => (
              <IssueEntry
                index={groups.mustDo.length + index}
                issue={issue}
                key={issue.id}
                targetUrl={targetUrl}
              />
            ))}
          </div>
        </section>
      ) : null}
      {hasFixableIssues ? null : (
        <p className="text-muted-foreground py-8 text-sm">
          {t("checklist.allPassed")}
        </p>
      )}
    </InstrumentModule>
  );
}
