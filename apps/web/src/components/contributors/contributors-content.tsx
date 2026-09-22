import { ActivityCard } from "@/components/contributors/activity-card";
import { ContributorsGrid } from "@/components/contributors/contributors-grid";
import { IssueList } from "@/components/contributors/issue-list";
import { NotraAiCallout } from "@/components/contributors/notra-ai-callout";
import { PullRequestList } from "@/components/contributors/pull-request-list";
import { ContributorsSectionHeader } from "@/components/contributors/section-header";
import { Sponsors } from "@/components/contributors/sponsors";
import {
  ACTIVITY_HEADING,
  ACTIVITY_SUBCOPY,
  CONTRIBUTORS_HEADING,
  CONTRIBUTORS_SUBCOPY,
  ISSUES_CARD_DESCRIPTION,
  ISSUES_CARD_TITLE,
  PRS_CARD_DESCRIPTION,
  PRS_CARD_TITLE,
} from "@/constants/contributors";
import { SPONSORS } from "@/lib/sponsors/constants";
import {
  fetchContributorsData,
  formatViewAllLabel,
  GITHUB_REPO_URL,
} from "@/utils/github";

export async function ContributorsContent() {
  const data = await fetchContributorsData();
  return (
    <>
      <section className="flex w-full flex-col items-center gap-13.5 px-6 pt-20 antialiased sm:px-12 lg:px-20 lg:pt-35">
        <ContributorsSectionHeader
          description={CONTRIBUTORS_SUBCOPY}
          title={CONTRIBUTORS_HEADING}
        />
        <ContributorsGrid contributors={data.contributors} />
        <NotraAiCallout prCount={data.notraAiPrCount} />
      </section>

      <Sponsors sponsors={SPONSORS} />

      <section className="mx-auto flex w-full max-w-360 flex-col items-center gap-13.5 px-6 pt-20 pb-20 antialiased sm:px-12 lg:px-20 lg:pt-35 lg:pb-35">
        <ContributorsSectionHeader
          description={ACTIVITY_SUBCOPY}
          title={ACTIVITY_HEADING}
        />
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
          <ActivityCard
            description={ISSUES_CARD_DESCRIPTION}
            title={ISSUES_CARD_TITLE}
            viewAllHref={`${GITHUB_REPO_URL}/issues`}
            viewAllLabel={formatViewAllLabel(data.stats.totalIssues)}
          >
            <IssueList issues={data.issues} />
          </ActivityCard>
          <ActivityCard
            description={PRS_CARD_DESCRIPTION}
            title={PRS_CARD_TITLE}
            viewAllHref={`${GITHUB_REPO_URL}/pulls`}
            viewAllLabel={formatViewAllLabel(data.stats.totalPullRequests)}
          >
            <PullRequestList prs={data.prs} />
          </ActivityCard>
        </div>
      </section>
    </>
  );
}
