import type { GitHubPublishContentType } from "@/types/integrations/github";

export const SITE_ENTRY_DIRECTORIES = {
  blog_post: "blog",
  changelog: "changelog",
} as const satisfies Record<GitHubPublishContentType, string>;

export const SITE_PUBLIC_DIRECTORY = "public";
export const SITE_IMAGE_DIRECTORY = "images";

export const SITE_ENTRY_DESCRIPTION_MAX_LENGTH = 160;

export const SITE_ENTRY_FALLBACK_SLUG = "post";
