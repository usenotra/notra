import type { SQL } from "drizzle-orm";

export interface DrizzleExecutor {
  execute(query: SQL): Promise<unknown>;
}
