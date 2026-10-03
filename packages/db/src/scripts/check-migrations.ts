import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import type { MigrationJournal } from "../types/migrations";
import { checkMigrations } from "../utils/check-migrations";

const migrationsDirectory = resolve(import.meta.dirname, "../../migrations");
const journal: MigrationJournal = JSON.parse(
  readFileSync(resolve(migrationsDirectory, "meta/_journal.json"), "utf8")
);
const sqlFiles = readdirSync(migrationsDirectory).filter((file) =>
  file.endsWith(".sql")
);
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { base: { type: "string" } },
});
const previousJournal: MigrationJournal | undefined = values.base
  ? JSON.parse(
      execFileSync(
        "git",
        ["show", `${values.base}:packages/db/migrations/meta/_journal.json`],
        { cwd: migrationsDirectory, encoding: "utf8" }
      )
    )
  : undefined;

checkMigrations(journal, sqlFiles, previousJournal);
console.log(`Validated ${journal.entries.length} migrations`);
