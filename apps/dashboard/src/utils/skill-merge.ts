import {
  SKILL_CONFLICT_END_REGEX,
  SKILL_CONFLICT_SEPARATOR_REGEX,
  SKILL_CONFLICT_START_REGEX,
} from "@/constants/skills";
import type {
  SkillConflictRegion,
  SkillConflictResolution,
} from "@/types/skills/merge";

/**
 * Regions of a merge result that still carry git conflict markers, in document
 * order — the same order `@pierre/diffs` numbers its conflicts in, so an index
 * from its renderer addresses the same region here.
 */
export function parseSkillConflicts(text: string): SkillConflictRegion[] {
  const lines = text.split("\n");
  const regions: SkillConflictRegion[] = [];

  let start: number | null = null;
  let separator: number | null = null;

  for (const [index, line] of lines.entries()) {
    if (SKILL_CONFLICT_START_REGEX.test(line)) {
      start = index;
      separator = null;
      continue;
    }
    if (start === null) {
      continue;
    }
    if (SKILL_CONFLICT_SEPARATOR_REGEX.test(line)) {
      separator = index;
      continue;
    }
    if (separator !== null && SKILL_CONFLICT_END_REGEX.test(line)) {
      regions.push({ start, separator, end: index });
      start = null;
      separator = null;
    }
  }

  return regions;
}

export function hasSkillConflictMarkers(text: string): boolean {
  return parseSkillConflicts(text).length > 0;
}

function pickResolvedLines(
  lines: string[],
  region: SkillConflictRegion,
  resolution: SkillConflictResolution
): string[] {
  const current = lines.slice(region.start + 1, region.separator);
  const incoming = lines.slice(region.separator + 1, region.end);

  if (resolution === "current") {
    return current;
  }
  if (resolution === "incoming") {
    return incoming;
  }
  return [...current, ...incoming];
}

/**
 * Replaces one marked region with the chosen side. `current` is the local text
 * (above the separator), `incoming` the upstream one, `both` keeps them in that
 * order — the same meanings the resolver UI offers.
 */
export function resolveSkillConflict(
  text: string,
  conflictIndex: number,
  resolution: SkillConflictResolution
): string {
  const regions = parseSkillConflicts(text);
  const region = regions[conflictIndex];
  if (!region) {
    return text;
  }

  const lines = text.split("\n");
  return [
    ...lines.slice(0, region.start),
    ...pickResolvedLines(lines, region, resolution),
    ...lines.slice(region.end + 1),
  ].join("\n");
}
