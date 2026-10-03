import type { OnDemandContentType } from "@notra/schemas/dashboard/content";
import type { ScheduleOutputType } from "@notra/schemas/dashboard/integrations";
import type { ManualPostContentType } from "@notra/schemas/shared/post";

import type { FormatCardMeta } from "@/types/content/formats";

export const FORMAT_CARD_META: Record<OnDemandContentType, FormatCardMeta> = {
  changelog: {
    iconClass: "text-violet-500 dark:text-violet-300",
  },
  blog_post: {
    iconClass: "text-emerald-500 dark:text-emerald-300",
  },
  linkedin_post: {
    iconClass: "text-[#0A66C2]",
  },
  twitter_post: {
    iconClass: "text-foreground",
  },
  image: {
    iconClass: "text-fuchsia-400",
  },
};

export const FORMAT_ORDER: ScheduleOutputType[] = [
  "changelog",
  "blog_post",
  "linkedin_post",
  "twitter_post",
  "image",
];

export const CREATE_CONTENT_FORMAT_ORDER: OnDemandContentType[] = [
  ...FORMAT_ORDER,
];

export const CREATE_POST_FORMAT_ORDER: ManualPostContentType[] = [
  "blog_post",
  "changelog",
  "linkedin_post",
  "twitter_post",
];

export const CREATE_POST_DEFAULT_FORMAT: ManualPostContentType = "blog_post";
