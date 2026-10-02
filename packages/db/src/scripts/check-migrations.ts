import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { MigrationJournal } from "../types/migrations";
import { checkMigrations } from "../utils/check-migrations";

const migrationsDirectory = resolve(import.meta.dirname, "../../migrations");
const journal: MigrationJournal = JSON.parse(
  readFileSync(resolve(migrationsDirectory, "meta/_journal.json"), "utf8")
);
const sqlFiles = readdirSync(migrationsDirectory).filter((file) =>
  file.endsWith(".sql")
);

checkMigrations(journal, sqlFiles);
console.log(`Validated ${journal.entries.length} migrations`);
