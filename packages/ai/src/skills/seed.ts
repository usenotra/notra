import { db } from "@notra/db/drizzle";
import { skills } from "@notra/db/schema";
import { nanoid } from "nanoid";

import { listLatestSystemSkills, publishSystemSkills } from "./registry";
import type { SystemSkillVersion } from "./types";

async function loadSeedableSystemSkills(): Promise<SystemSkillVersion[]> {
  const latest = await listLatestSystemSkills(db);

  if (latest.length > 0) {
    return latest;
  }

  // Fresh database: nothing has published yet, so seed would silently insert
  // nothing and the org would start without system skills.
  await publishSystemSkills(db);
  return await listLatestSystemSkills(db);
}

/**
 * Copies the latest registry version of every system skill into a new
 * organization. A custom skill already occupying a system name wins; we skip it
 * and log rather than overwrite the user's own skill.
 */
export async function seedSystemSkills(
  organizationId: string
): Promise<number> {
  const versions = await loadSeedableSystemSkills();

  if (versions.length === 0) {
    return 0;
  }

  const inserted = await db
    .insert(skills)
    .values(
      versions.map((version) => ({
        id: nanoid(),
        organizationId,
        name: version.name,
        description: version.description,
        content: version.content,
        isSystem: true,
        systemSkillVersionId: version.id,
      }))
    )
    .onConflictDoNothing({
      target: [skills.organizationId, skills.name],
    })
    .returning({ name: skills.name });

  if (inserted.length < versions.length) {
    const insertedNames = new Set(inserted.map((row) => row.name));
    console.warn("[skills] system skill names already taken, seeding skipped", {
      organizationId,
      names: versions
        .map((version) => version.name)
        .filter((name) => !insertedNames.has(name)),
    });
  }

  return inserted.length;
}
