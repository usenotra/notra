import type { IntegrationTool } from "@/types/integrations";
import type {
  SlackFeature,
  SlackHeadline,
  SlackThreadMessage,
} from "@/types/slack-integration";
import { APP_URL } from "@/utils/urls";

export const SLACK_HEADLINE: SlackHeadline = {
  pre: "Mention",
  mention: "@Notra",
  secondLinePre: "and get",
  accent: "a draft back.",
};

export const SLACK_HERO_SUBHEAD =
  "Tag Notra in a thread or send it a DM. It reads the thread and checks GitHub, Linear and Granola for what shipped. Then it replies with a draft you can approve in Slack.";

export const SLACK_CONNECT_LABEL = "Add to Slack";

export const SLACK_CONNECT_HREF = `${APP_URL}/integrations/slack`;

export const SLACK_MARKETPLACE_LABEL = "View in marketplace";

export const SLACK_MARKETPLACE_HREF = "/integrations";

export const SLACK_THREAD_CHANNEL = "#launches";

export const SLACK_THREAD_REPLIES_LABEL = "3 replies";

const SLACK_BOT_NAME = "Notra";

export const SLACK_BOT_BADGE_LABEL = "APP";

export const SLACK_THREAD_MESSAGES: SlackThreadMessage[] = [
  {
    author: "maya",
    message: "scheduler v2 is live for everyone 🎉",
    avatarGradient:
      "linear-gradient(135deg in oklab, oklab(89.3% 0.019 0.048) 0%, oklab(72.9% 0.086 0.095) 100%)",
  },
  {
    author: "jonas",
    mention: "@Notra",
    message: "can you turn this into a changelog entry and an X post?",
    avatarGradient:
      "linear-gradient(135deg in oklab, oklab(81.7% 0.039 -0.074) 0%, oklab(60.6% 0.085 -0.202) 100%)",
  },
  {
    author: SLACK_BOT_NAME,
    isBot: true,
    message:
      "I found 3 merged PRs for scheduler v2 on GitHub. Both drafts are ready to review.",
  },
];

export const SLACK_DRAFT_TITLE = "Changelog draft";

export const SLACK_DRAFT_SECONDARY_ACTION_LABEL = "Edit";

export const SLACK_DRAFT_ACTION_LABEL = "Approve";

export const SLACK_DRAFT_HEADLINE = "Scheduler v2 is here";

export const SLACK_DRAFT_BODY =
  "Rollouts now run in parallel across every region, so a full deploy finishes in about four minutes. We also fixed a timezone bug in the schedule preview.";

export const SLACK_DRAFT_META = "Drafted in #launches · from 3 merged PRs";

export const SLACK_FEATURES: SlackFeature[] = [
  {
    title: "Mention it or DM it",
    description:
      "Tag @Notra in a channel your admin has enabled, or DM it. Replies in the same thread continue the conversation.",
  },
  {
    title: "Approve in the thread",
    description:
      "Each draft arrives as a card with an approve button. Posts for X can go out from Slack.",
  },
  {
    title: "Synced with your dashboard",
    description:
      "Notra copies public-channel threads into Notra chat, so your team can continue them from the dashboard.",
  },
];

export const SLACK_TOOLS: IntegrationTool[] = [
  {
    name: "create_changelog",
    title: null,
    description: "Draft a changelog entry from what your team shipped.",
  },
  {
    name: "create_twitter_post",
    title: null,
    description: "Write a post for X and send it from Slack.",
  },
  {
    name: "create_linkedin_post",
    title: null,
    description: "Draft a LinkedIn post in your brand voice.",
  },
  {
    name: "create_blog_post",
    title: null,
    description: "Write a long-form blog post from a thread or a feature.",
  },
  {
    name: "get_pull_requests",
    title: null,
    description: "Read a GitHub pull request, including its diff stats.",
  },
  {
    name: "get_linear_issues",
    title: null,
    description: "Pull Linear issues for a team and timeframe.",
  },
  {
    name: "get_granola_notes",
    title: null,
    description: "Find Granola meeting notes and their summaries.",
  },
];

export const SLACK_CTA_BADGE_LABEL = "Get 10% off the yearly plan";

export const SLACK_CTA_HEADING = "Announce what you ship from Slack";

export const SLACK_CTA_SUBCOPY =
  "Add Notra to Slack and turn this week's threads into posts ready to publish.";

export const SLACK_CTA_PRIMARY_LABEL = "Start for free";

export const SLACK_CTA_SECONDARY_LABEL = "Book a Call";

export const SLACK_CTA_CONTACT_HREF = "/contact";

export const SLACK_SIGNUP_SOURCE = "slack_integration";
