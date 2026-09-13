import {
  TONE_SECTION_MARKER,
  TONE_VARIANTS_VERSION,
} from "@notra/ai/constants/tones";
import { db } from "@notra/db/drizzle";
import { skills } from "@notra/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getConversationalBlogPostPrompt } from "../prompts/blog_post/conversational";
import { buildBlogPostToneAppendix } from "../prompts/blog_post/tones";
import { getConversationalChangelogPrompt } from "../prompts/changelog/conversational";
import { buildChangelogToneAppendix } from "../prompts/changelog/tones";
import { getConversationalLinkedInPrompt } from "../prompts/linkedin/conversational";
import { buildLinkedInToneAppendix } from "../prompts/linkedin/tones";
import { getConversationalTwitterPrompt } from "../prompts/twitter/conversational";
import { buildTwitterToneAppendix } from "../prompts/twitter/tones";
import { HUMANIZER_CONTENT } from "./humanizer-content";

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
        "Generate a comprehensive changelog from GitHub commits, pull requests, releases, and Linear issues for a given lookback window. Filters for high-signal changes and formats with Highlights + categorized More Updates. Follows the <tone> value from the user prompt using the tone section in this skill.",
      content: `${getConversationalChangelogPrompt()}\n\n${buildChangelogToneAppendix()}`,
    },
    {
      name: "blog-post",
      description:
        "Write a long-form blog post from GitHub and Linear data. Produces narrative prose with structure and voice, not a bullet-list changelog. Follows the <tone> value from the user prompt using the tone section in this skill.",
      content: `${getConversationalBlogPostPrompt()}\n\n${buildBlogPostToneAppendix()}`,
    },
    {
      name: "twitter",
      description:
        "Compose a Twitter/X post from recent development activity. Short-form, attention-grabbing, in the brand's voice. Follows the <tone> value from the user prompt using the tone section in this skill.",
      content: `${getConversationalTwitterPrompt()}\n\n${buildTwitterToneAppendix()}`,
    },
    {
      name: "linkedin",
      description:
        "Compose a LinkedIn post from recent development activity. Medium-form, optimized for the LinkedIn feed, in the brand's voice. Follows the <tone> value from the user prompt using the tone section in this skill.",
      content: `${getConversationalLinkedInPrompt()}\n\n${buildLinkedInToneAppendix()}`,
    },
    {
      name: "humanizer",
      description:
        "Remove signs of AI-generated writing from text. Use as a sub-skill from other skills to humanize a near-final draft before publishing.",
      content: HUMANIZER_CONTENT.trim(),
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

const TONE_APPENDIX_BY_SKILL: Record<string, () => string> = {
  changelog: buildChangelogToneAppendix,
  "blog-post": buildBlogPostToneAppendix,
  twitter: buildTwitterToneAppendix,
  linkedin: buildLinkedInToneAppendix,
};

export function stripToneAppendix(content: string): string {
  return content
    .replace(/<tone-variants[^>]*>[\s\S]*?<\/tone-variants>/g, "")
    .trim();
}

const TONE_V2_OPEN_RE = new RegExp(
  `<tone-variants[^>]*version="${TONE_VARIANTS_VERSION}"[^>]*>`
);

export async function ensureSystemSkillToneSections(
  organizationId: string
): Promise<number> {
  const names = Object.keys(TONE_APPENDIX_BY_SKILL);
  const rows = await db
    .select({ name: skills.name, content: skills.content })
    .from(skills)
    .where(
      and(
        eq(skills.organizationId, organizationId),
        eq(skills.isSystem, true),
        inArray(skills.name, names)
      )
    );

  const pending = rows.flatMap((row) => {
    // Already on the current appendix version (tolerant to whitespace /
    // attribute order) — nothing to do.
    if (TONE_V2_OPEN_RE.test(row.content)) {
      return [];
    }
    const buildAppendix = TONE_APPENDIX_BY_SKILL[row.name];
    if (!buildAppendix) {
      return [];
    }
    // Covers both v1 appendices and rows with no appendix (e.g. seeded before
    // tone variants existed). System skills must carry the appendix, so a
    // missing section is (re-)appended rather than treated as an intentional
    // deletion.
    const baseContent = row.content.includes(TONE_SECTION_MARKER)
      ? stripToneAppendix(row.content)
      : row.content.trim();
    return [
      {
        name: row.name,
        originalContent: row.content,
        content: `${baseContent}\n\n${buildAppendix()}`,
      },
    ];
  });

  if (pending.length === 0) {
    return 0;
  }

  await Promise.all(
    pending.map((item) =>
      db
        .update(skills)
        .set({ content: item.content, updatedAt: new Date() })
        .where(
          and(
            eq(skills.organizationId, organizationId),
            eq(skills.isSystem, true),
            eq(skills.name, item.name),
            // Optimistic-concurrency guard: skip rows edited after our read
            // instead of overwriting a concurrent skill edit with stale
            // content.
            eq(skills.content, item.originalContent)
          )
        )
    )
  );

  return pending.length;
}
