export const AUTOMATION_OUTPUT_TYPES = [
  "changelog",
  "blog_post",
  "twitter_post",
  "linkedin_post",
  "investor_update",
  "image",
] as const;

export const OUTPUT_TYPE_LABEL_KEYS = {
  changelog: "changelogEntry",
  blog_post: "blogPost",
  linkedin_post: "linkedinPost",
  twitter_post: "tweet",
  image: "image",
} as const;
