"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { AgentFeedbackCard } from "@/components/agent-feedback/feedback-card";
import { AgentFeedbackSetupNudge } from "@/components/agent-feedback/feedback-setup-nudge";
import { Button } from "@/components/button";
import Link from "@/components/framework/link";
import { AGENT_FEEDBACK_NAV_LINK } from "@/constants/agent-feedback";
import { useAgentFeedbackList } from "@/lib/hooks/use-agent-feedback";
import type { HomeFeedbackSectionProps } from "@/types/dashboard/home";

const RECENT_FEEDBACK_LIMIT = 3;
const FEEDBACK_SKELETON_IDS = ["first", "second", "third"] as const;

/** Latest agent feedback on the Studio home, or a nudge to set it up. */
export function HomeFeedbackSection({
  organizationId,
  slug,
  compact = false,
}: HomeFeedbackSectionProps) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const feedback = useAgentFeedbackList(organizationId, "all");
  const recentFeedback = (feedback.data?.pages[0]?.items ?? []).slice(
    0,
    RECENT_FEEDBACK_LIMIT
  );
  const feedbackHref = `/${slug}${AGENT_FEEDBACK_NAV_LINK}`;

  let feedbackContent: React.ReactNode;
  if (!organizationId || feedback.isPending) {
    feedbackContent = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEEDBACK_SKELETON_IDS.map((id) => (
          <Skeleton className="h-[8.75rem] w-full rounded-xl" key={id} />
        ))}
      </div>
    );
  } else if (recentFeedback.length === 0) {
    feedbackContent = (
      <AgentFeedbackSetupNudge
        compact={compact}
        organizationId={organizationId}
      />
    );
  } else {
    feedbackContent = (
      <div className="grid auto-rows-[1fr] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recentFeedback.map((item) => (
          <AgentFeedbackCard href={feedbackHref} item={item} key={item.id} />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:items-center @min-[40rem]/main:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            {tCommon("labels.feedback")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("feedbackDescription")}
          </p>
        </div>
        {recentFeedback.length > 0 ? (
          <Button
            nativeButton={false}
            render={<Link href={feedbackHref} />}
            variant="outline"
          >
            {tCommon("actions.viewAll")}
          </Button>
        ) : null}
      </div>
      {feedbackContent}
    </section>
  );
}
