import type { IntegrationTool } from "@/types/integrations";
import type {
  SlackFeature,
  SlackHeadline,
  SlackThreadMessage,
} from "@/types/slack-integration";
import { APP_URL } from "@/utils/urls";

export const SLACK_HEADLINE: SlackHeadline = {
  pre: "Turn",
  channel: "#big-launch",
  post: "threads",
  secondLinePre: "into",
  accent: "announcements.",
};

export const SLACK_HERO_SUBHEAD =
  "Decisions and launches already live in your channels. Notra follows the ones you pick and turns threads into announcements, changelog entries, and social posts, in your voice.";

export const SLACK_CONNECT_LABEL = "Connect Slack";

export const SLACK_CONNECT_HREF = `${APP_URL}/integrations/slack`;

export const SLACK_MARKETPLACE_LABEL = "View in marketplace";

export const SLACK_MARKETPLACE_HREF = "/integrations";

export const SLACK_THREAD_CHANNEL = "#big-launch";

export const SLACK_THREAD_REPLIES_LABEL = "14 replies";

export const SLACK_THREAD_MESSAGES: SlackThreadMessage[] = [
  {
    author: "maya",
    message: "scheduler v2 is live for everyone 🎉",
    avatarGradient:
      "linear-gradient(135deg in oklab, oklab(89.3% 0.019 0.048) 0%, oklab(72.9% 0.086 0.095) 100%)",
  },
  {
    author: "jonas",
    message: "rollout took 4 minutes, zero errors. huge.",
    avatarGradient:
      "linear-gradient(135deg in oklab, oklab(81.7% 0.039 -0.074) 0%, oklab(60.6% 0.085 -0.202) 100%)",
  },
  {
    author: "sam",
    message: "customers in the beta channel are loving it already",
    avatarGradient:
      "linear-gradient(135deg in oklab, oklab(88.8% -0.035 -0.035) 0%, oklab(71.2% -0.049 -0.109) 100%)",
  },
];

export const SLACK_DRAFT_TITLE = "Announcement draft";

export const SLACK_DRAFT_ACTION_LABEL = "Publish";

export const SLACK_DRAFT_HEADLINE = "Scheduler v2 is here";

export const SLACK_DRAFT_BODY =
  "Today we shipped the new scheduler to every workspace. Rollouts now finish in minutes, and beta customers have been running it for weeks without a hiccup.";

export const SLACK_DRAFT_META = "Drafted from #big-launch · sounds like you";

export const SLACK_FEATURES: SlackFeature[] = [
  {
    title: "Follows the channels you pick",
    description:
      "Point Notra at your launch and ship channels. Everything else stays private.",
  },
  {
    title: "Drafts in your voice",
    description:
      "Threads become announcements that read like your best writer, not a summary bot.",
  },
  {
    title: "Publishes where you announce",
    description:
      "Send the result to your changelog, blog, X, or LinkedIn without leaving Notra.",
  },
];

export const SLACK_TOOLS: IntegrationTool[] = [
  {
    name: "list_channels",
    title: null,
    description: "List the channels your workspace has shared with Notra.",
  },
  {
    name: "get_thread",
    title: null,
    description: "Fetch a full thread with replies and reactions.",
  },
  {
    name: "search_messages",
    title: null,
    description: "Search messages across connected channels.",
  },
  {
    name: "post_message",
    title: null,
    description: "Post an update into any connected channel.",
  },
  {
    name: "get_channel_history",
    title: null,
    description: "Read recent history from a channel.",
  },
  {
    name: "get_permalink",
    title: null,
    description: "Get a shareable link to any message.",
  },
  {
    name: "add_reaction",
    title: null,
    description: "React to a message in a connected channel.",
  },
];

export const SLACK_CTA_BADGE_LABEL = "Get 10% off the yearly plan";

export const SLACK_CTA_HEADING = "Stop shipping in silence";

export const SLACK_CTA_SUBCOPY =
  "Connect Slack and turn this week's threads into publish-ready announcements, in your voice.";

export const SLACK_CTA_PRIMARY_LABEL = "Start for free";

export const SLACK_CTA_SECONDARY_LABEL = "Book a Call";

export const SLACK_CTA_CONTACT_HREF = "/contact";

export const SLACK_SIGNUP_SOURCE = "slack_integration";
