import type {
  SITE_NAVBAR_LINK_TYPES,
  SITE_SOCIAL_PLATFORMS,
} from "@notra/sites-core/constants/site-layout";

export const PLATFORM_LABELS: Record<
  | (typeof SITE_SOCIAL_PLATFORMS)[number]
  | (typeof SITE_NAVBAR_LINK_TYPES)[number],
  string
> = {
  x: "X",
  github: "GitHub",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  discord: "Discord",
  slack: "Slack",
  instagram: "Instagram",
  facebook: "Facebook",
  bluesky: "Bluesky",
  threads: "Threads",
  reddit: "Reddit",
  medium: "Medium",
  telegram: "Telegram",
  "hacker-news": "Hacker News",
  website: "Website",
};
