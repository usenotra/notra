import type { PullRequestListProps } from "~types/contributors";

import { ActivityRow } from "@/components/contributors/activity-row";
import {
  PR_DRAFT_BADGE_CLASS,
  PR_READY_BADGE_CLASS,
} from "@/constants/contributors";

export function PullRequestList({ prs }: PullRequestListProps) {
  if (prs.length === 0) {
    return (
      <div className="py-8 text-center font-sans text-sm text-[#6A6B70] dark:text-white/60">
        No open pull requests at the moment
      </div>
    );
  }
  return prs.map((pr, index) => (
    <ActivityRow
      authorAvatarUrl={pr.user.avatar_url}
      authorLogin={pr.user.login}
      badgeClassName={pr.draft ? PR_DRAFT_BADGE_CLASS : PR_READY_BADGE_CLASS}
      badgeLabel={pr.draft ? "Draft" : "Ready"}
      createdAt={pr.created_at}
      href={pr.html_url}
      isLast={index === prs.length - 1}
      key={pr.id}
      number={pr.number}
      title={pr.title}
    />
  ));
}
