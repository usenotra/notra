import type {
  ApplySlashSkillResult,
  SkillSlashOption,
  SlashMenuKeyHandler,
  SlashSkillQuery,
} from "@/types/skills/slash";

const SLASH_QUERY_CHARS = /^[a-z0-9-]*$/i;

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

  const charBefore = start > 0 ? textBefore[start - 1] : " ";
  const isBoundary =
    start === 0 ||
    charBefore === " " ||
    charBefore === "\n" ||
    charBefore === "\u00A0";
  if (!isBoundary) {
    return null;
  }

  const query = textBefore.slice(start + 1);
  if (
    query.includes(" ") ||
    query.includes("\n") ||
    query.includes("\u00A0") ||
    !SLASH_QUERY_CHARS.test(query)
  ) {
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
  cursor: number,
  skillName: string
): ApplySlashSkillResult {
  const token = `/${skillName} `;
  return {
    text: `${text.slice(0, slashQuery.start)}${token}${text.slice(cursor)}`,
    cursor: slashQuery.start + token.length,
  };
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
    event.preventDefault();
    if (matchCount > 0) {
      onSelect();
    }
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return true;
  }

  return false;
}
