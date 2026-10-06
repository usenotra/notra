import type { IntegrationTool } from "@/types/integrations";
import type {
  LinearFeature,
  LinearHeadline,
  LinearIssue,
} from "@/types/linear-integration";
import { APP_URL } from "@/utils/urls";

export const LINEAR_HEADLINE: LinearHeadline = {
  pre: "Turn",
  highlight: "closed issues",
  secondLinePre: "into",
  accent: "release notes.",
};

export const LINEAR_HERO_SUBHEAD =
  "Notra reads the issues, projects and cycles in your Linear workspace. It turns finished work into release notes and changelog entries in your brand voice.";

export const LINEAR_CONNECT_LABEL = "Connect Linear";

export const LINEAR_CONNECT_HREF = `${APP_URL}/integrations/linear`;

export const LINEAR_MARKETPLACE_LABEL = "View in marketplace";

export const LINEAR_MARKETPLACE_HREF = "/integrations";

export const LINEAR_CYCLE_NAME = "Cycle 24";

export const LINEAR_CYCLE_DONE_LABEL = "12 done";

export const LINEAR_ISSUES: LinearIssue[] = [
  {
    identifier: "ENG-412",
    title: "Run scheduler rollouts in parallel",
    label: "Feature",
  },
  {
    identifier: "ENG-405",
    title: "Batch deploys across regions",
    label: "Improvement",
  },
  {
    identifier: "ENG-398",
    title: "Fix timezone drift in schedule preview",
    label: "Bug",
  },
];

export const LINEAR_DRAFT_TITLE = "Release notes draft";

export const LINEAR_DRAFT_ACTION_LABEL = "Publish";

export const LINEAR_DRAFT_HEADLINE = "What shipped in cycle 24";

export const LINEAR_DRAFT_BODY =
  "Scheduler rollouts now run in parallel and deploys batch across regions, so a full rollout takes about four minutes. Schedule previews also show the right time in every timezone.";

export const LINEAR_DRAFT_META = "Drafted from 12 issues in cycle 24";

export const LINEAR_FEATURES: LinearFeature[] = [
  {
    title: "Reads your workspace",
    description:
      "Connect Linear and Notra can read the issues, projects and cycles in your workspace. You choose which work goes into each draft.",
  },
  {
    title: "Knows what finished",
    description:
      "Notra reads issue state, labels and cycle dates, so release notes only cover work that shipped.",
  },
  {
    title: "Publishes where you announce",
    description:
      "Send the draft to your changelog, blog, X or LinkedIn from Notra.",
  },
];

export const LINEAR_TOOLS: IntegrationTool[] = [
  {
    name: "get_linear_issues",
    title: null,
    description:
      "Get the issues for a team with their state, priority, assignee and labels.",
  },
  {
    name: "get_linear_projects",
    title: null,
    description: "Get projects with their progress and timeline.",
  },
  {
    name: "get_linear_cycles",
    title: null,
    description: "Get recent cycles for a team, including the active one.",
  },
];

export const LINEAR_CTA_HEADING = "Write release notes when the sprint ends";

export const LINEAR_CTA_SUBCOPY =
  "Connect Linear and turn this cycle's finished issues into release notes ready to publish.";

export const LINEAR_SIGNUP_SOURCE = "linear_integration";
