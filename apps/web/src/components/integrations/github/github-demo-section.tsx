import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GithubDraftCard } from "@/components/integrations/github/github-draft-card";
import { GithubPullRequestCard } from "@/components/integrations/github/github-pull-request-card";

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
      <GithubDraftCard />
    </div>
  );
}
