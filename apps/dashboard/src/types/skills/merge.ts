/** Line indices of one marked conflict region, all zero-based. */
export interface SkillConflictRegion {
  /** The `<<<<<<<` line. */
  start: number;
  /** The `=======` line. */
  separator: number;
  /** The `>>>>>>>` line. */
  end: number;
}

/** `current` is the local text, `incoming` the upstream one. */
export type SkillConflictResolution = "current" | "incoming" | "both";
