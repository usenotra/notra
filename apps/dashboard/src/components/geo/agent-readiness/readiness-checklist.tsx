"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  buildAgentReadinessAllFixesPrompt,
  buildAgentReadinessFixPrompt,
  getAgentReadinessIssueChanges,
  groupAgentReadinessIssues,
} from "@notra/geo-core/utils/agent-readiness";
import { InstrumentModule } from "@notra/ui/components/instrument/instrument-module";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { useTranslations } from "use-intl";

import { AgentReadinessChangeBadge } from "@/components/geo/agent-readiness/readiness-change-badge";
import { AgentReadinessCopyPromptButton } from "@/components/geo/agent-readiness/readiness-copy-prompt-button";
import { AGENT_READINESS_FIX_COPY_KINDS } from "@/constants/geo-analytics";
import type {
  AgentReadinessChecklistProps,
  AgentReadinessIssueRowProps,
  AgentReadinessResultBadgeProps,
  AgentReadinessSectionHeaderProps,
} from "@/types/agent-readiness";

function ResultBadge({ result }: AgentReadinessResultBadgeProps) {
  const t = useTranslations("geo.agentReadiness.checklist");
  const tCommon = useTranslations("common");

  if (result === "failed") {
    return <Badge variant="destructive">{tCommon("labels.failed")}</Badge>;
  }
  return <Badge variant="warning">{t("partial")}</Badge>;
}

function IssueRow({ issue, change, targetUrl }: AgentReadinessIssueRowProps) {
  const t = useTranslations("geo.agentReadiness.checklist");

  return (
    <div className="group/row border-b last:border-b-0">
      <Collapsible>
        <div className="hover:bg-muted/30 has-[[data-slot=collapsible-trigger]:focus-visible]:ring-ring/50 flex items-center gap-3 pr-4 has-[[data-slot=collapsible-trigger]:focus-visible]:ring-2 has-[[data-slot=collapsible-trigger]:focus-visible]:ring-inset">
          <CollapsibleTrigger className="flex min-w-0 flex-1 text-left">
            <span className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5">
              <HugeiconsIcon
                className="text-muted-foreground duration-fast shrink-0 -rotate-90 transition-transform ease-out group-has-data-[panel-open]/row:rotate-0"
                icon={ArrowDown01Icon}
                size={14}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {issue.name}
                  </span>
                  <AgentReadinessChangeBadge change={change} />
                </span>
                {issue.details ? (
                  <span className="text-muted-foreground truncate text-xs group-has-data-[panel-open]/row:hidden">
                    {issue.details}
                  </span>
                ) : null}
              </span>
              <ResultBadge result={issue.result} />
            </span>
          </CollapsibleTrigger>
          <div className="hidden sm:block">
            <AgentReadinessCopyPromptButton
              checkId={issue.id}
              copyKind={AGENT_READINESS_FIX_COPY_KINDS.FIX}
              label={t("copyFix")}
              prompt={buildAgentReadinessFixPrompt(targetUrl, issue)}
              size="xs"
              variant="ghost"
            />
          </div>
        </div>
        <CollapsibleContent>
          <div className="grid gap-4 pr-5 pb-4 pl-5 sm:pl-12 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">
                {t("whatWeFound")}
              </span>
              <p className="text-sm">{issue.details ?? t("noDetails")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">
                {t("suggestedFix")}
              </span>
              <p className="text-sm">
                {issue.recommendation ?? t("noRecommendation")}
              </p>
            </div>
            <div className="sm:hidden">
              <AgentReadinessCopyPromptButton
                checkId={issue.id}
                copyKind={AGENT_READINESS_FIX_COPY_KINDS.FIX}
                label={t("copyFix")}
                prompt={buildAgentReadinessFixPrompt(targetUrl, issue)}
                size="xs"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function SectionHeader({
  label,
  hint,
  count,
}: AgentReadinessSectionHeaderProps) {
  return (
    <div className="bg-muted/40 flex flex-wrap items-baseline gap-x-2 border-b px-5 py-2 text-xs">
      <span className="text-foreground font-medium">
        {label} <span className="tabular-nums">{count}</span>
      </span>
      <span className="text-muted-foreground">{hint}</span>
    </div>
  );
}

export function AgentReadinessChecklist({
  targetUrl,
  issues,
  comparison,
}: AgentReadinessChecklistProps) {
  const t = useTranslations("geo.agentReadiness");
  const groups = groupAgentReadinessIssues(issues);
  const changes = getAgentReadinessIssueChanges(comparison);
  const sections = [
    {
      key: "mustDo",
      label: t("groups.mustDoLabel"),
      hint: t("groups.mustDoHint"),
      issues: groups.mustDo,
    },
    {
      key: "shouldDo",
      label: t("groups.shouldDoLabel"),
      hint: t("groups.shouldDoHint"),
      issues: groups.shouldDo,
    },
  ].filter((section) => section.issues.length > 0);

  return (
    <InstrumentModule
      action={
        sections.length > 0 ? (
          <AgentReadinessCopyPromptButton
            copyKind={AGENT_READINESS_FIX_COPY_KINDS.BACKLOG}
            label={t("checklist.copyFullBacklog")}
            prompt={buildAgentReadinessAllFixesPrompt(targetUrl, issues)}
            size="xs"
          />
        ) : undefined
      }
      bodyClassName="p-0"
      eyebrow={t("checklist.eyebrow")}
      variant="table"
    >
      {sections.map((section) => (
        <section className="border-b last:border-b-0" key={section.key}>
          <SectionHeader
            count={section.issues.length}
            hint={section.hint}
            label={section.label}
          />
          {section.issues.map((issue) => (
            <IssueRow
              change={changes.get(issue.id)}
              issue={issue}
              key={issue.id}
              targetUrl={targetUrl}
            />
          ))}
        </section>
      ))}
      {sections.length === 0 ? (
        <p className="text-muted-foreground p-5 text-sm">
          {t("checklist.allPassed")}
        </p>
      ) : null}
    </InstrumentModule>
  );
}
