import { db } from "@notra/db/drizzle";
import { skills } from "@notra/db/schema";
import { nanoid } from "nanoid";

import { getConversationalBlogPostPrompt } from "../prompts/blog_post/conversational";
import { getConversationalChangelogPrompt } from "../prompts/changelog/conversational";
import { getConversationalLinkedInPrompt } from "../prompts/linkedin/conversational";
import { getConversationalTwitterPrompt } from "../prompts/twitter/conversational";
import { UNSLOP_DESCRIPTION } from "./constants";
import { HUMANIZER_CONTENT } from "./humanizer-content";
import { UNSLOP_CONTENT } from "./unslop-content";

interface SystemSkillDefinition {
  name: string;
  description: string;
  content: string;
}

function buildSystemSkills(): SystemSkillDefinition[] {
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
    {
      name: "unslop",
      description: UNSLOP_DESCRIPTION,
      content: UNSLOP_CONTENT,
    },
  ];
}

export async function seedSystemSkills(
  organizationId: string
): Promise<number> {
  const definitions = buildSystemSkills();

  const rows = definitions.map((def) => ({
    id: nanoid(),
    organizationId,
    name: def.name,
    description: def.description,
    content: def.content,
    isSystem: true,
  }));

  const inserted = await db
    .insert(skills)
    .values(rows)
    .onConflictDoNothing({
      target: [skills.organizationId, skills.name],
    })
    .returning({ id: skills.id });

  return inserted.length;
}

/** Add the new system skill to organizations created before it was seeded. */
export async function ensureUnslopSkill(organizationId: string) {
  await db
    .insert(skills)
    .values({
      id: nanoid(),
      organizationId,
      name: "unslop",
      description: UNSLOP_DESCRIPTION,
      content: UNSLOP_CONTENT,
      isSystem: true,
    })
    .onConflictDoNothing({ target: [skills.organizationId, skills.name] });
}
