import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GithubPullRequestCard } from "@/components/integrations/github/github-pull-request-card";
import { IntegrationDraftCard } from "@/components/integrations/integration-draft-card";
import {
  GITHUB_DRAFT_ACTION_LABEL,
  GITHUB_DRAFT_BODY,
  GITHUB_DRAFT_HEADLINE,
  GITHUB_DRAFT_META,
  GITHUB_DRAFT_TITLE,
} from "@/constants/github-integration";

export function GithubDemoSection() {
  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row">
      <GithubPullRequestCard />
      <HugeiconsIcon
        className="text-primary shrink-0 rotate-90 lg:rotate-0"
        icon={ArrowRight02Icon}
        size={28}
        strokeWidth={2.2}
      />
      <IntegrationDraftCard
        actionLabel={GITHUB_DRAFT_ACTION_LABEL}
        body={GITHUB_DRAFT_BODY}
        headline={GITHUB_DRAFT_HEADLINE}
        meta={GITHUB_DRAFT_META}
        title={GITHUB_DRAFT_TITLE}
      />
    </div>
  );
}
