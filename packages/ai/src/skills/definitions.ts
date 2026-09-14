import { getConversationalBlogPostPrompt } from "../prompts/blog_post/conversational";
import { getConversationalChangelogPrompt } from "../prompts/changelog/conversational";
import { getConversationalLinkedInPrompt } from "../prompts/linkedin/conversational";
import { getConversationalTwitterPrompt } from "../prompts/twitter/conversational";
import { HUMANIZER_CONTENT } from "./humanizer-content";
import type { SystemSkillDefinition } from "./types";

/**
 * The system skills as defined in code. `publishSystemSkills` turns these into
 * immutable rows in `system_skill_versions`; nothing else should copy them into
 * an organization directly.
 */
export function getSystemSkillDefinitions(): SystemSkillDefinition[] {
  return [
    {
      name: "changelog",
      description:
        "Generate a comprehensive changelog from GitHub commits, pull requests, releases, and Linear issues for a given lookback window. Filters for high-signal changes and formats with Highlights + categorized More Updates.",
      content: getConversationalChangelogPrompt(),
    },
    {
      name: "blog-post",
      description:
        "Write a long-form blog post from GitHub and Linear data. Produces narrative prose with structure and voice, not a bullet-list changelog.",
      content: getConversationalBlogPostPrompt(),
    },
    {
      name: "twitter",
      description:
        "Compose a Twitter/X post from recent development activity. Short-form, attention-grabbing, with the brand's voice.",
      content: getConversationalTwitterPrompt(),
    },
    {
      name: "linkedin",
      description:
        "Compose a LinkedIn post from recent development activity. Professional tone, medium-form, optimized for the LinkedIn feed.",
      content: getConversationalLinkedInPrompt(),
    },
    {
      name: "humanizer",
      description:
        "Remove signs of AI-generated writing from text. Use as a sub-skill from other skills to humanize a near-final draft before publishing.",
      content: HUMANIZER_CONTENT.trim(),
    },
  ];
}
