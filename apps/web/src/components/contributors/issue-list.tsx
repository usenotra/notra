import type { IssueListProps } from "~types/contributors";

import { ActivityRow } from "@/components/contributors/activity-row";
import { getIssueTypeFromLabels } from "@/utils/github";

export function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="py-8 text-center font-sans text-sm text-[#6A6B70] dark:text-white/60">
        No open issues at the moment
      </div>
    );
  }
  return issues.map((issue, index) => {
    const issueType = getIssueTypeFromLabels(issue.labels);
    return (
      <ActivityRow
        authorAvatarUrl={issue.user.avatar_url}
        authorLogin={issue.user.login}
        badgeClassName={issueType.className}
        badgeLabel={issueType.type}
        createdAt={issue.created_at}
        href={issue.html_url}
        isLast={index === issues.length - 1}
        key={issue.id}
        number={issue.number}
        title={issue.title}
      />
    );
  });
}
