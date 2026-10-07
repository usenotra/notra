import { db } from "@notra/db/drizzle";
import { skills } from "@notra/db/schema";
import { nanoid } from "nanoid";

import { UNSLOP_DESCRIPTION } from "./constants";
import { buildSystemSkills } from "./system-skills";
import { UNSLOP_CONTENT } from "./unslop-content";

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
