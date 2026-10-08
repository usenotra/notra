/** Social platform a content type posts to; the dashboard and the server share it. */
export type ScheduleSocialPlatform = "twitter" | "linkedin";

const GITHUB_DESTINATION_CONTENT_TYPES = ["changelog", "blog_post"] as const;
export type GitHubScheduleContentType =
  (typeof GITHUB_DESTINATION_CONTENT_TYPES)[number];

const SOCIAL_PLATFORM_BY_CONTENT_TYPE: Partial<
  Record<string, ScheduleSocialPlatform>
> = {
  twitter_post: "twitter",
  linkedin_post: "linkedin",
};

export function isGitHubScheduleContentType(
  contentType: string
): contentType is GitHubScheduleContentType {
  return (GITHUB_DESTINATION_CONTENT_TYPES as readonly string[]).includes(
    contentType
  );
}

/** Destinations a content type can go out to besides Notra itself. */
export function scheduleDestinationsForContentType(contentType: string): {
  github: boolean;
  socialPlatform: ScheduleSocialPlatform | null;
} {
  return {
    github: isGitHubScheduleContentType(contentType),
    socialPlatform: SOCIAL_PLATFORM_BY_CONTENT_TYPE[contentType] ?? null,
  };
}
