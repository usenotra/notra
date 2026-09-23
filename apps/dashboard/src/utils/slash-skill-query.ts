import type {
  ApplySlashSkillResult,
  SkillSlashOption,
  SlashMenuKeyHandler,
  SlashSkillQuery,
} from "@/types/skills/slash";

const SLASH_QUERY_CHARS = /^[a-z0-9-]*$/i;
const SKILL_DRAFT_TOKEN_SPLIT_REGEX = /(@skill\/[a-z0-9]+(?:-[a-z0-9]+)*)/g;
const SKILL_DRAFT_TOKEN_VALUE = /^@skill\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

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

export function formatSkillDraftTokens(names: readonly string[]): string {
  return names.map((name) => `@skill/${name}`).join("\n");
}

export function extractSkillDraftTokens(value: string): {
  names: string[];
  text: string;
} {
  const names: string[] = [];
  const textSegments: string[] = [];
  for (const segment of value.split(SKILL_DRAFT_TOKEN_SPLIT_REGEX)) {
    const match = segment.match(SKILL_DRAFT_TOKEN_VALUE);
    if (match?.[1]) {
      names.push(match[1]);
      continue;
    }
    textSegments.push(segment);
  }
  return { names, text: textSegments.join("") };
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
