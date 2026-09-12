import { projects } from "@notra/db/schema";
import { type SQL, asc } from "drizzle-orm";

/**
 * Oldest-first, then id so equal `createdAt` ties resolve to the same project
 * for server scope, `projectsList`, and other oldest-project lookups.
 */
export const GEO_PROJECTS_OLDEST_ORDER: SQL[] = [
  asc(projects.createdAt),
  asc(projects.id),
];
