import { createSkillSchema } from "@notra/ai/schemas/skills";
import { renderSkillToolOutput } from "@notra/ai/skills/functions/guidance";
import {
  createSkill as createSkillRecord,
  listSkillCatalog,
  loadSkillByName,
} from "@notra/ai/skills/functions/service";
import { toolDescription } from "@notra/ai/utils/description";
import { type Tool, tool } from "ai";
import z from "zod";

export interface SkillsToolContext {
  organizationId: string;
}

export function listAvailableSkills(ctx: SkillsToolContext): Tool {
  return tool({
    description:
      "List available skills for this organization. Returns the permission-scoped skill catalog: name, description, and system status. Call getSkillByName to load a skill's full content before applying it.",
    inputSchema: z.object({
      limit: z.number().default(20).describe("The number of skills to list"),
      offset: z
        .number()
        .default(0)
        .describe("The offset to start listing skills from"),
    }),
    execute: async ({ limit, offset }) => {
      return listSkillCatalog(ctx, { limit, offset });
    },
  });
}

export function getSkillByName(ctx: SkillsToolContext): Tool {
  return tool({
    description:
      "Load a skill's full content by name. Returns a <skill_content> block containing the full skill body. Call listAvailableSkills first unless the exact skill name is already present in the prompt catalog.",
    inputSchema: z.object({
      name: z.string().describe("The name of the skill to load."),
    }),
    execute: async ({ name }) => {
      const skill = await loadSkillByName(ctx, name);

      if (!skill) {
        return {
          error: `Skill "${name}" not found. Use listAvailableSkills to see available skills.`,
        };
      }

      return {
        name: skill.name,
        description: skill.description,
        content: skill.content,
        skillContent: renderSkillToolOutput(skill),
      };
    },
  });
}

export function createCreateSkillTool(ctx: SkillsToolContext): Tool {
  return tool({
    description: toolDescription({
      toolName: "createSkill",
      intro:
        "Creates a new reusable writing skill (voice, format, structure guidance) for this organization.",
      whenToUse:
        "The user explicitly asks for a new skill, or a clearly new and recurring writing need appears that no existing skill covers.",
      whenNotToUse:
        "An existing skill already fits; reuse or edit that skill instead of creating a near-duplicate.",
      usageNotes:
        "Check listAvailableSkills for duplicates first. The name must be unique, lowercase kebab-case (letters, digits, hyphens only, max 64 chars). Provide a one-sentence description of when the skill applies plus the full skill body as content.",
    }),
    inputSchema: createSkillSchema.extend({
      name: createSkillSchema.shape.name.describe(
        "Unique skill name in lowercase kebab-case."
      ),
      description: createSkillSchema.shape.description.describe(
        "One-sentence description of when to apply this skill."
      ),
      content: createSkillSchema.shape.content.describe(
        "The full skill body: the reusable writing guidance applied when drafting content."
      ),
    }),
    execute: async ({ name, description, content }) => {
      const skill = await createSkillRecord(
        { organizationId: ctx.organizationId },
        { name, description, content }
      );

      return {
        name: skill.name,
        status: "created",
      };
    },
  });
}
