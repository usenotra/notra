import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { MigrationJournal } from "../src/types/migrations";
import { checkMigrations } from "../src/utils/check-migrations";

test("the committed SQL files match the journal", () => {
  const directory = resolve(import.meta.dirname, "../migrations");
  const journal: MigrationJournal = JSON.parse(
    readFileSync(resolve(directory, "meta/_journal.json"), "utf8")
  );
  expect(() =>
    checkMigrations(
      journal,
      readdirSync(directory).filter((file) => file.endsWith(".sql"))
    )
  ).not.toThrow();
});

test("rejects orphan SQL and missing SQL", () => {
  const journal = { entries: [{ idx: 0, tag: "0000_baseline", when: 1 }] };
  expect(() =>
    checkMigrations(journal, ["0000_baseline.sql", "0001_orphan.sql"])
  ).toThrow("Unjournaled migration SQL");
  expect(() => checkMigrations(journal, [])).toThrow("Missing migration SQL");
});

test("rejects empty journals, invalid tags, indices and timestamps", () => {
  expect(() => checkMigrations({ entries: [] }, [])).toThrow();
  for (const entry of [
    { idx: 1, tag: "0000_baseline", when: 1 },
    { idx: 0, tag: "../baseline", when: 1 },
    { idx: 0, tag: "0000_baseline", when: -1 },
    { idx: 0, tag: "0000_baseline", when: 1.5 },
  ]) {
    expect(() =>
      checkMigrations({ entries: [entry] }, [`${entry.tag}.sql`])
    ).toThrow();
  }
  for (const when of [1, 0]) {
    expect(() =>
      checkMigrations(
        {
          entries: [
            { idx: 0, tag: "0000_baseline", when: 1 },
            { idx: 1, tag: "0001_next", when },
          ],
        },
        ["0000_baseline.sql", "0001_next.sql"]
      )
    ).toThrow("increasing timestamp");
  }
});

test("rejects duplicate tags and new prefix collisions", () => {
  for (const tag of ["0000_baseline", "0000_collision"]) {
    expect(() =>
      checkMigrations(
        {
          entries: [
            { idx: 0, tag: "0000_baseline", when: 1 },
            { idx: 1, tag, when: 2 },
          ],
        },
        ["0000_baseline.sql", `${tag}.sql`]
      )
    ).toThrow("Duplicate migration");
  }
});

test("grandfathers only the exact historical prefix pairs", () => {
  const entries = [
    { idx: 0, tag: "0009_cuddly_quentin_quire", when: 1 },
    { idx: 1, tag: "0009_brief_union_jack", when: 2 },
    { idx: 2, tag: "0029_redundant_steel_serpent", when: 3 },
    { idx: 3, tag: "0029_spicy_network", when: 4 },
  ];
  expect(() =>
    checkMigrations(
      { entries },
      entries.map((entry) => `${entry.tag}.sql`)
    )
  ).not.toThrow();

  const extra = [...entries, { idx: 4, tag: "0009_another", when: 5 }];
  expect(() =>
    checkMigrations(
      { entries: extra },
      extra.map((entry) => `${entry.tag}.sql`)
    )
  ).toThrow("Duplicate migration prefix 0009");

  const renamed = entries.map((entry) =>
    entry.idx === 1 ? { ...entry, tag: "0009_renamed" } : entry
  );
  expect(() =>
    checkMigrations(
      { entries: renamed },
      renamed.map((entry) => `${entry.tag}.sql`)
    )
  ).toThrow("Duplicate migration prefix 0009");
});
