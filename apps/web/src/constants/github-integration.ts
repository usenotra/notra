import type {
  GithubFeature,
  GithubHeadline,
  GithubPullRequest,
} from "@/types/github-integration";
import type { IntegrationTool } from "@/types/integrations";
import { APP_URL } from "@/utils/urls";

export const GITHUB_HEADLINE: GithubHeadline = {
  pre: "Turn",
  highlight: "merged PRs",
  secondLinePre: "into",
  accent: "changelogs.",
};

export const GITHUB_HERO_SUBHEAD =
  "Notra reads the pull requests, releases and commits in the repositories you connect. It turns what merged into changelog entries and launch posts in your brand voice.";

export const GITHUB_CONNECT_LABEL = "Connect GitHub";

export const GITHUB_CONNECT_HREF = `${APP_URL}/integrations/github`;

export const GITHUB_MARKETPLACE_LABEL = "View in marketplace";

export const GITHUB_MARKETPLACE_HREF = "/integrations";

export const GITHUB_REPOSITORY = "acme/app";

export const GITHUB_MERGED_BADGE_LABEL = "Merged";

export const GITHUB_PULL_REQUEST: GithubPullRequest = {
  number: "#482",
  title: "Run scheduler rollouts in parallel",
  author: "maya",
  commitCount: "3 commits",
  baseBranch: "main",
  headBranch: "scheduler-parallel",
  comment:
    "Rollouts now fan out per region instead of running one after another. A full deploy dropped from 22 minutes to about 4.",
  commentAge: "2 days ago",
  mergeCommit: "8f3c2a1",
  mergeAge: "1 hour ago",
  tabs: [
    { label: "Conversation", count: "4", active: true },
    { label: "Commits", count: "3" },
    { label: "Checks", count: "6" },
    { label: "Files changed", count: "12" },
  ],
};

export const GITHUB_DRAFT_TITLE = "Changelog draft";

export const GITHUB_DRAFT_ACTION_LABEL = "Publish";

export const GITHUB_DRAFT_HEADLINE = "Scheduler v2 is here";

export const GITHUB_DRAFT_BODY =
  "Rollouts now run in parallel across every region. A full deploy that used to take 22 minutes now finishes in about four.";

export const GITHUB_DRAFT_META = "Drafted from #482 in acme/app";

export const GITHUB_FEATURES: GithubFeature[] = [
  {
    title: "Reads the repos you pick",
    description:
      "Notra only sees the repositories you connect. It reads their pull requests, releases and commits.",
  },
  {
    title: "Checks the code behind a feature",
    description:
      "Before it writes about a feature, Notra reads the diff. The post describes what changed instead of repeating the PR title.",
  },
  {
    title: "Runs on a schedule",
    description:
      "Set up a weekly changelog and Notra drafts it from everything merged since the last run.",
  },
];

export const GITHUB_TOOLS: IntegrationTool[] = [
  {
    name: "get_pull_requests",
    title: null,
    description:
      "Get a pull request with its title, body, reviewers, labels and diff stats.",
  },
  {
    name: "get_commits_by_timeframe",
    title: null,
    description: "List the commits in a date range.",
  },
  {
    name: "get_release_by_tag",
    title: null,
    description: "Get a release by tag, including its notes and assets.",
  },
];

export const GITHUB_CTA_BADGE_LABEL = "Get 10% off the yearly plan";

export const GITHUB_CTA_HEADING = "Publish a changelog every week";

export const GITHUB_CTA_SUBCOPY =
  "Connect a repository and turn this week's merged PRs into a changelog ready to publish.";

export const GITHUB_CTA_PRIMARY_LABEL = "Start for free";

export const GITHUB_CTA_SECONDARY_LABEL = "Book a Call";

export const GITHUB_CTA_CONTACT_HREF = "/contact";

export const GITHUB_SIGNUP_SOURCE = "github_integration";
