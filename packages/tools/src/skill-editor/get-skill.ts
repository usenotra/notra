import { currentSkillContent } from "@notra/ai/skills/functions/current-content";
import { db } from "@notra/db/drizzle";
import { skills } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { defineTool } from "eve/tools";

import { skillNameInputSchema } from "../schemas/skill-tools";
import { requireOrganizationId } from "../utils/organization";

export function createGetSkillTool() {
  return defineTool({
    description:
      "Read the full content of one of the organization's skills by name.",
    inputSchema: skillNameInputSchema,
    async execute({ name }, ctx) {
      const organizationId = requireOrganizationId(ctx);
      const rows = await db
        .select({
          name: skills.name,
          description: skills.description,
          content: skills.content,
          isSystem: skills.isSystem,
          createdAt: skills.createdAt,
          updatedAt: skills.updatedAt,
        })
        .from(skills)
        .where(
          and(eq(skills.organizationId, organizationId), eq(skills.name, name))
        )
        .limit(1);

      const skill = rows[0];
      if (!skill) {
        throw new Error(`Skill "${name}" was not found for this organization`);
      }
      return {
        name: skill.name,
        description: skill.description,
        content: currentSkillContent(skill),
        isSystem: skill.isSystem,
      };
    },
  });
}
