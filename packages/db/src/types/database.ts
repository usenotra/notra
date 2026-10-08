import type { drizzle } from "drizzle-orm/node-postgres";

import type * as schema from "../schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;
