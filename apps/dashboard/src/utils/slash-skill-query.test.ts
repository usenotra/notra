import { expect, test } from "bun:test";

import {
  applySlashSkill,
  cycleSlashIndex,
  filterSlashSkills,
  getSlashSkillQuery,
  handleSlashMenuKeyDown,
} from "./slash-skill-query";

const SKILLS = [
  { name: "humanizer", description: "Remove AI-sounding prose" },
  { name: "blog-post", description: "House blog format" },
  { name: "changelog", description: "Keep the changelog tight" },
] as const;

test("opens on a leading slash and keeps the typed query", () => {
  expect(getSlashSkillQuery("/", 1)).toEqual({ query: "", start: 0 });
  expect(getSlashSkillQuery("/hum", 4)).toEqual({ query: "hum", start: 0 });
  expect(getSlashSkillQuery("use /blog-p", 11)).toEqual({
    query: "blog-p",
    start: 4,
  });
});

test("ignores slashes that are not on a word boundary", () => {
  expect(getSlashSkillQuery("https://x", 9)).toBeNull();
  expect(getSlashSkillQuery("3/4", 3)).toBeNull();
  expect(getSlashSkillQuery("say /hum please", 15)).toBeNull();
});

test("closes once the query hits a space or punctuation", () => {
  expect(getSlashSkillQuery("/hum ", 5)).toBeNull();
  expect(getSlashSkillQuery("/hum!", 5)).toBeNull();
});

test("filters skills by name or description", () => {
  expect(filterSlashSkills(SKILLS, "").map((skill) => skill.name)).toEqual([
    "humanizer",
    "blog-post",
    "changelog",
  ]);
  expect(filterSlashSkills(SKILLS, "HUM").map((skill) => skill.name)).toEqual([
    "humanizer",
  ]);
  expect(
    filterSlashSkills(SKILLS, "format").map((skill) => skill.name)
  ).toEqual(["blog-post"]);
});

test("replaces the slash query with a tagged skill token", () => {
  expect(
    applySlashSkill("use /hum", { query: "hum", start: 4 }, 8, "humanizer")
  ).toEqual({
    text: "use /humanizer ",
    cursor: 15,
  });
});

test("cycles the highlighted skill", () => {
  expect(cycleSlashIndex(0, 3, 1)).toBe(1);
  expect(cycleSlashIndex(2, 3, 1)).toBe(0);
  expect(cycleSlashIndex(0, 3, -1)).toBe(2);
  expect(cycleSlashIndex(0, 0, 1)).toBe(0);
});

test("slash menu keys select, move, close, and block send", () => {
  const moves: Array<1 | -1> = [];
  let selected = 0;
  let closed = 0;
  const handler = {
    isOpen: true,
    matchCount: 2,
    onMove: (delta: 1 | -1) => {
      moves.push(delta);
    },
    onSelect: () => {
      selected += 1;
    },
    onClose: () => {
      closed += 1;
    },
  };

  const down = { key: "ArrowDown", preventDefault() {} };
  const enter = { key: "Enter", preventDefault() {} };
  const tab = { key: "Tab", preventDefault() {} };
  const escape = { key: "Escape", preventDefault() {} };
  const letter = { key: "h", preventDefault() {} };

  expect(handleSlashMenuKeyDown(down, handler)).toBe(true);
  expect(handleSlashMenuKeyDown(enter, handler)).toBe(true);
  expect(handleSlashMenuKeyDown(tab, handler)).toBe(true);
  expect(handleSlashMenuKeyDown(escape, handler)).toBe(true);
  expect(handleSlashMenuKeyDown(letter, handler)).toBe(false);
  expect(moves).toEqual([1]);
  expect(selected).toBe(2);
  expect(closed).toBe(1);

  expect(handleSlashMenuKeyDown(enter, { ...handler, matchCount: 0 })).toBe(
    true
  );
  expect(selected).toBe(2);
  expect(handleSlashMenuKeyDown(enter, { ...handler, isOpen: false })).toBe(
    false
  );
});
