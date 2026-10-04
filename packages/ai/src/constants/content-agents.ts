import type { ContentAgentProfile } from "@notra/ai/types/agents";

/** What differs between the background content agents; everything else is shared. */
export const CONTENT_AGENT_PROFILES = {
  changelog: {
    skillName: "changelog",
    contentType: "changelog",
    brandAgentType: "changelog",
    contentLabel: "changelog",
  },
  blog_post: {
    skillName: "blog-post",
    contentType: "blog_post",
    brandAgentType: "blog",
    contentLabel: "blog post",
  },
  linkedin_post: {
    skillName: "linkedin",
    contentType: "linkedin_post",
    brandAgentType: "linkedin",
    contentLabel: "LinkedIn post",
  },
  twitter_post: {
    skillName: "twitter",
    contentType: "twitter_post",
    brandAgentType: "twitter",
    contentLabel: "tweet",
    includeSearchBrandReferencesTool: true,
  },
} as const satisfies Record<string, ContentAgentProfile>;
