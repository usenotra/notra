import { LEGACY_MIGRATION_PREFIX_COLLISIONS } from "../constants/migrations";
import type { MigrationJournal } from "../types/migrations";

export function checkMigrations(
  journal: MigrationJournal,
  sqlFiles: string[]
): void {
  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    throw new Error("Migration journal must contain entries");
  }

  const tags = new Set<string>();
  const files = new Set(sqlFiles);
  const prefixes = new Map<string, string[]>();
  let previousTimestamp = -1;

  for (const [index, entry] of journal.entries.entries()) {
    if (entry.idx !== index) {
      throw new Error(`Migration ${entry.tag} must have idx ${index}`);
    }
    if (!/^\d{4,}_[a-z0-9_]+$/.test(entry.tag)) {
      throw new Error(`Invalid migration tag: ${entry.tag}`);
    }
    if (!Number.isSafeInteger(entry.when) || entry.when <= previousTimestamp) {
      throw new Error(
        `Migration ${entry.tag} must have an increasing timestamp`
      );
    }
    previousTimestamp = entry.when;
    if (tags.has(entry.tag)) {
      throw new Error(`Duplicate migration tag: ${entry.tag}`);
    }
    tags.add(entry.tag);
    if (!files.delete(`${entry.tag}.sql`)) {
      throw new Error(`Missing migration SQL: ${entry.tag}.sql`);
    }

    const prefix = entry.tag.slice(0, entry.tag.indexOf("_"));
    const group = prefixes.get(prefix) ?? [];
    group.push(entry.tag);
    prefixes.set(prefix, group);
  }

  if (files.size > 0) {
    throw new Error(`Unjournaled migration SQL: ${[...files].join(", ")}`);
  }

  for (const [prefix, group] of prefixes) {
    if (
      group.length > 1 &&
      !LEGACY_MIGRATION_PREFIX_COLLISIONS.some(
        (legacy) =>
          group.length === legacy.length &&
          legacy.every((tag) => group.includes(tag))
      )
    ) {
      throw new Error(
        `Duplicate migration prefix ${prefix}: ${group.join(", ")}`
      );
    }
  }
}
