import { getConversationalBlogPostPrompt } from "../../prompts/blog_post/conversational";
import { UNSLOP_CONTENT } from "../unslop-content";

/** System skills whose seeded copies follow the code instead of the seed-time text. */
const REFRESHED_SYSTEM_SKILLS: Readonly<Record<string, () => string>> = {
  "blog-post": getConversationalBlogPostPrompt,
  unslop: () => UNSLOP_CONTENT,
};

interface StoredSkill {
  name: string;
  content: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The content to show or apply for a stored skill: an untouched seeded copy
 * gets the current text, an edited one keeps the organization's text. Every
 * read path (agents, editor, API) must use this, or saving from a stale view
 * writes the old text back and freezes it as an edit.
 */
export function currentSkillContent(skill: StoredSkill): string {
  const isUntouchedSeed =
    skill.isSystem && skill.updatedAt.getTime() === skill.createdAt.getTime();
  const current = isUntouchedSeed
    ? REFRESHED_SYSTEM_SKILLS[skill.name]
    : undefined;
  return current ? current() : skill.content;
}
