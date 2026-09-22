import type {
  SkillListItem,
  SkillSortKey,
  SkillSortState,
} from "@/types/skills/page";

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 31_536_000_000 },
  { unit: "month", ms: 2_592_000_000 },
  { unit: "week", ms: 604_800_000 },
  { unit: "day", ms: 86_400_000 },
  { unit: "hour", ms: 3_600_000 },
  { unit: "minute", ms: 60_000 },
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export function formatSkillUpdatedAt(
  value: string | Date,
  now = Date.now()
): string {
  const diff = new Date(value).getTime() - now;
  for (const { unit, ms } of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return relativeFormatter.format(Math.round(diff / ms), unit);
    }
  }
  return "Just now";
}

export function filterSkills<T extends SkillListItem>(
  skills: T[],
  query: string
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return skills;
  }
  return skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(needle) ||
      skill.description.toLowerCase().includes(needle)
  );
}

function compareBy(key: SkillSortKey, a: SkillListItem, b: SkillListItem) {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "type":
      return Number(b.isSystem) - Number(a.isSystem);
    case "updatedAt":
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    default:
      return 0;
  }
}

export function sortSkills<T extends SkillListItem>(
  skills: T[],
  sort: SkillSortState
): T[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  return skills.toSorted((a, b) => {
    const primary = compareBy(sort.key, a, b) * sign;
    return primary === 0 ? a.name.localeCompare(b.name) : primary;
  });
}

export function skillQuickstartError(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname !== "skills.sh") {
      return "Only skills.sh links are supported.";
    }
    return null;
  } catch {
    return "Enter a valid skills.sh URL.";
  }
}

export function toggleSkillSort(
  current: SkillSortState,
  key: SkillSortKey
): SkillSortState {
  if (current.key !== key) {
    return { key, direction: key === "updatedAt" ? "desc" : "asc" };
  }
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}
