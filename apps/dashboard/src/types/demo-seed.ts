import type { BLOG_POST_SUBTYPES } from "@notra/db/constants/content";
import type { postCollectionSourceEnum } from "@notra/db/schema";
import type { GeoPersonaProfile } from "@notra/db/types/geo-personas";

export interface DemoSeedPost {
  title: string;
  slug?: string;
  contentType: "blog_post" | "changelog" | "linkedin_post" | "twitter_post";
  contentSubtype?: (typeof BLOG_POST_SUBTYPES)[number];
  status: "draft" | "published";
  daysAgo: number;
  markdown: string;
}

export interface DemoSeedCollection {
  key: string;
  name: string;
  source: (typeof postCollectionSourceEnum.enumValues)[number];
  daysAgo: number;
  posts: readonly DemoSeedPost[];
}

export interface DemoSeedTeammate {
  name: string;
  email: string;
  role: "admin" | "member";
  joinedDaysAgo: number;
}

export interface DemoSeedSchedule {
  name: string;
  outputType: "changelog" | "blog_post" | "linkedin_post";
  cron: {
    frequency: "daily" | "weekly" | "monthly";
    hour: number;
    minute: number;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  lookbackWindow: "last_7_days" | "last_30_days";
  autoPublish: boolean;
  instructions: string;
}

export interface DemoSeedSkill {
  name: string;
  description: string;
  content: string;
}

export interface DemoSeedPersona {
  name: string;
  role: string;
  company: string;
  summary: string;
  searchStyle: string;
  profile: GeoPersonaProfile;
  conversationPrompts: string[];
}
