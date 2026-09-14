import type {
  SkillUpstreamDetail,
  SkillUpstreamStatus,
} from "@notra/ai/skills/types";

import { SKILL_EDITOR_VIEWS } from "@/constants/skills";
import type {
  SkillDiffThemeType,
  SkillEditorView,
  SkillListItem,
  SkillSortKey,
  SkillSortState,
  SkillStatus,
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

/** Drops the full version rows: list and detail responses carry status only. */
export function toSkillUpstreamStatus(
  detail: SkillUpstreamDetail
): SkillUpstreamStatus {
  return {
    systemName: detail.systemName,
    baseVersion: detail.baseVersion,
    latestVersion: detail.latestVersion,
    isModified: detail.isModified,
    updateAvailable: detail.updateAvailable,
    changelog: detail.changelog,
  };
}

/**
 * The four states of a system skill copy. Custom skills have no upstream and
 * always read as `current`.
 */
export function getSkillStatus(
  upstream: SkillUpstreamStatus | null | undefined
): SkillStatus {
  if (!upstream) {
    return "current";
  }
  if (upstream.updateAvailable) {
    return upstream.isModified ? "conflict" : "update-available";
  }
  return upstream.isModified ? "modified" : "current";
}

/** `null` for an empty or valid skills.sh link; otherwise the message to show. */
export function getSkillQuickstartError(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(trimmed).host === "skills.sh"
      ? null
      : "Only skills.sh links are supported.";
  } catch {
    return "Enter a valid skills.sh URL.";
  }
}

export function isSkillEditorView(value: unknown): value is SkillEditorView {
  return (SKILL_EDITOR_VIEWS as readonly unknown[]).includes(value);
}

function compareBy(key: SkillSortKey, a: SkillListItem, b: SkillListItem) {
  if (key === "updatedAt") {
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  }
  return a.name.localeCompare(b.name);
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

export function toggleSkillSort(
  current: SkillSortState,
  key: SkillSortKey
): SkillSortState {
  if (current.key !== key) {
    return { key, direction: key === "updatedAt" ? "desc" : "asc" };
  }
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

/**
 * Diffs of two texts that only differ in a trailing newline otherwise render a
 * "No newline at end of file" row on both sides.
 */
export function withTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

/**
 * `next-themes` reports `undefined` until it has read the DOM; `system` lets
 * `@pierre/diffs` pick from the media query in the meantime.
 */
export function resolveDiffThemeType(
  resolvedTheme: string | undefined
): SkillDiffThemeType {
  if (resolvedTheme === "dark") {
    return "dark";
  }
  if (resolvedTheme === "light") {
    return "light";
  }
  return "system";
}
