import { posts } from "@notra/db/schema";
import { eq, sql } from "drizzle-orm";

export function normalizePostUpdatedAt(date: Date) {
  return new Date(date);
}

export function postUpdatedAtMatches(stored: Date, expected: Date) {
  return (
    normalizePostUpdatedAt(stored).getTime() ===
    normalizePostUpdatedAt(expected).getTime()
  );
}

export function matchesPostUpdatedAt(expected: Date) {
  return eq(
    sql<Date>`date_trunc('milliseconds', ${posts.updatedAt})`,
    sql.param(normalizePostUpdatedAt(expected), posts.updatedAt)
  );
}
