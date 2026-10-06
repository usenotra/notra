"use client";

import {
  AgentFeedbackKindBadge,
  AgentFeedbackStatusBadge,
} from "@/components/agent-feedback/feedback-badges";
import Link from "@/components/framework/link";
import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import type { AgentFeedbackCardProps } from "@/types/agent-feedback";

/** Feedback item in the same card frame as content cards on the home page. */
export function AgentFeedbackCard({ item, href }: AgentFeedbackCardProps) {
  const formatRelative = useFormatRelative();
  const heading = item.title ?? item.message;

  return (
    <Link
      className="focus-visible:ring-ring block h-full w-full min-w-0 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
      href={href}
    >
      <div className="border-border/80 border-b-border/40 bg-muted/80 hover:border-border flex h-full flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs transition-colors">
        <div className="border-border/60 bg-background flex min-h-28 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1.5">
            <p className="line-clamp-2 min-w-0 text-sm leading-snug font-medium wrap-anywhere">
              {heading}
            </p>
            <span className="text-muted-foreground shrink-0 pt-0.5 text-xs tabular-nums">
              {formatRelative(item.createdAt)}
            </span>
          </div>
          {item.title ? (
            <p className="text-muted-foreground line-clamp-3 [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)] px-3 pb-3 text-sm wrap-anywhere">
              {item.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-1 pb-0.5">
          <AgentFeedbackKindBadge kind={item.kind} />
          <AgentFeedbackStatusBadge status={item.status} />
        </div>
      </div>
    </Link>
  );
}
