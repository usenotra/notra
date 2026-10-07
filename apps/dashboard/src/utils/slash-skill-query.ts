import type {
  ApplySlashSkillResult,
  SkillSlashOption,
  SlashMenuKeyHandler,
  SlashSkillQuery,
} from "@/types/skills/slash";

const SLASH_QUERY_CHARS = /^[a-z0-9-]*$/i;
const SKILL_NAME_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKILL_DRAFT_TOKEN_VALUE = /^@skill\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const SKILL_DRAFT_STORAGE_SUFFIX = ":skills";

function isSlashWhitespace(char: string): boolean {
  return /\s/.test(char);
}

export function getSlashSkillQuery(
  text: string,
  cursor: number
): SlashSkillQuery | null {
  if (cursor < 1) {
    return null;
  }

  const textBefore = text.slice(0, cursor);
  const start = textBefore.lastIndexOf("/");
  if (start === -1) {
    return null;
  }

  const charBefore = start > 0 ? (textBefore[start - 1] ?? " ") : " ";
  const isBoundary = start === 0 || isSlashWhitespace(charBefore);
  if (!isBoundary) {
    return null;
  }

  const query = textBefore.slice(start + 1);
  if (/\s/.test(query) || !SLASH_QUERY_CHARS.test(query)) {
    return null;
  }

  return { query, start };
}

export function filterSlashSkills<T extends SkillSlashOption>(
  skills: readonly T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...skills];
  }

  return skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q)
  );
}

export function applySlashSkill(
  text: string,
  slashQuery: SlashSkillQuery,
  cursor: number
): ApplySlashSkillResult {
  return {
    text: `${text.slice(0, slashQuery.start)}${text.slice(cursor)}`,
    cursor: slashQuery.start,
  };
}

export function prependTaggedSkills(
  text: string,
  skillNames: readonly string[]
): string {
  const prefix = skillNames.map((name) => `/${name}`).join(" ");
  const trimmed = text.trim();
  if (!prefix) {
    return trimmed;
  }
  if (!trimmed) {
    return prefix;
  }
  return `${prefix} ${trimmed}`;
}

export function skillDraftStorageKey(draftStorageKey: string): string {
  return `${draftStorageKey}${SKILL_DRAFT_STORAGE_SUFFIX}`;
}

export function parseSkillDraftNames(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (name): name is string =>
        typeof name === "string" && SKILL_NAME_VALUE.test(name)
    );
  } catch {
    return [];
  }
}

export function extractSkillDraftTokens(value: string): {
  names: string[];
  text: string;
} {
  const lines = value.split("\n");
  const names: string[] = [];
  while (lines.length > 0) {
    const match = lines.at(-1)?.match(SKILL_DRAFT_TOKEN_VALUE);
    if (!match?.[1]) {
      break;
    }
    names.unshift(match[1]);
    lines.pop();
  }
  return { names, text: lines.join("\n") };
}

export function cycleSlashIndex(
  index: number,
  length: number,
  delta: 1 | -1
): number {
  if (length <= 0) {
    return 0;
  }

  return (index + delta + length) % length;
}

export function handleSlashMenuKeyDown(
  event: { key: string; preventDefault: () => void },
  { isOpen, matchCount, onMove, onSelect, onClose }: SlashMenuKeyHandler
): boolean {
  if (!isOpen) {
    return false;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (matchCount > 0) {
      onMove(1);
    }
    return true;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (matchCount > 0) {
      onMove(-1);
    }
    return true;
  }

  if (event.key === "Enter" || event.key === "Tab") {
    if (matchCount <= 0) {
      return false;
    }
    event.preventDefault();
    onSelect();
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return true;
  }

  return false;
}
