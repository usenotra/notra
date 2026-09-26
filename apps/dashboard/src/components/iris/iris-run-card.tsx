import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import Link from "next/link";

import { IrisArtifactCard } from "@/components/iris/iris-artifact-card";
import { IrisRunStatusBadge } from "@/components/iris/iris-run-status-badge";
import { cn } from "@/lib/utils";
import type { IrisRunCardProps, IrisRunTaskView } from "@/types/iris";
import {
  describeIrisDecision,
  describeIrisOutbox,
  formatIrisRelativeTime,
  humanizeIrisCapability,
  humanizeIrisTaskStatus,
  humanizeIrisTrigger,
} from "@/utils/iris-copy";

function taskIcon(status: IrisRunTaskView["status"]) {
  if (status === "completed") {
    return CheckmarkCircle02Icon;
  }
  if (status === "failed" || status === "canceled") {
    return Alert02Icon;
  }
  if (status === "running") {
    return Loading03Icon;
  }
  return Clock01Icon;
}

function taskIconClass(status: IrisRunTaskView["status"]) {
  if (status === "completed") {
    return "text-success";
  }
  if (status === "failed" || status === "canceled") {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

function noticeClass(tone: "info" | "warning" | "danger") {
  if (tone === "warning") {
    return "border-warning/30 bg-warning/5";
  }
  if (tone === "danger") {
    return "border-destructive/30 bg-destructive/5";
  }
  return "border-border";
}

export function IrisRunCard({ run, organizationSlug }: IrisRunCardProps) {
  const decision = describeIrisDecision(run);
  const outboxNotice = describeIrisOutbox(run.outbox);
  const showTasks = run.decision === "plan" && run.tasks.length > 0;

  return (
    <article className="border-border space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <IrisRunStatusBadge status={run.status} />
        <Badge variant="outline">{humanizeIrisTrigger(run.trigger)}</Badge>
        <span className="text-muted-foreground ml-auto text-xs">
          {formatIrisRelativeTime(run.startedAt)}
        </span>
      </div>

      <div className="space-y-1 wrap-anywhere">
        <p className="text-sm font-medium">{decision.headline}</p>
        {decision.detail ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {decision.detail}
          </p>
        ) : null}
      </div>

      {showTasks ? (
        <ul className="space-y-1.5">
          {run.tasks.map((task) => (
            <li className="flex items-start gap-2 text-xs" key={task.id}>
              <HugeiconsIcon
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  taskIconClass(task.status)
                )}
                icon={taskIcon(task.status)}
              />
              <span className="font-medium">
                {humanizeIrisCapability(task.capabilityName)}
              </span>
              <span className="text-muted-foreground">
                {humanizeIrisTaskStatus(task.status)}
              </span>
              {task.errorMessage ? (
                <span
                  className="text-destructive min-w-0 flex-1 truncate"
                  title={task.errorMessage}
                >
                  {task.errorMessage}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {run.artifacts.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {run.artifacts.map((artifact) => (
            <IrisArtifactCard
              artifact={artifact}
              key={artifact.postId}
              organizationSlug={organizationSlug}
            />
          ))}
        </div>
      ) : null}

      {outboxNotice ? (
        <div
          className={cn(
            "text-muted-foreground flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            noticeClass(outboxNotice.tone)
          )}
        >
          <span className="min-w-0 flex-1 wrap-anywhere">
            {outboxNotice.message}
          </span>
          {outboxNotice.needsSlackFix ? (
            <Link
              className="text-foreground inline-flex shrink-0 items-center gap-1 font-medium hover:underline"
              href={`/${organizationSlug}/integrations/slack`}
            >
              Fix Slack
              <HugeiconsIcon className="size-3.5" icon={ArrowRight01Icon} />
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
