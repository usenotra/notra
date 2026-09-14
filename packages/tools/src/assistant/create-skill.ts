import { createSkill } from "@notra/ai/skills/functions/service";
import { defineTool } from "eve/tools";

import { createSkillInputSchema } from "../schemas/skill-tools";
import { requireOrganizationId } from "../utils/organization";
import { getSessionAttribute } from "../utils/session";

export function createCreateSkillTool() {
  return defineTool({
    description:
      "Create a new content skill for this organization. A skill is reusable writing guidance (voice, format, structure) applied when drafting content. Always call list_available_skills first and reuse an existing skill when one fits; only create when the user explicitly asks for a new skill or a clearly new, recurring writing need appears. The name must be unique and lowercase kebab-case.",
    inputSchema: createSkillInputSchema,
    approval: (ctx) =>
      getSessionAttribute(ctx, "surface") === "task"
        ? "approved"
        : "user-approval",
    async execute({ name, description, content }, ctx) {
      const organizationId = requireOrganizationId(ctx);
      const skill = await createSkill(
        { organizationId },
        { name, description, content }
      );

      return {
        name: skill.name,
        status: "created",
      };
    },
  });
}
