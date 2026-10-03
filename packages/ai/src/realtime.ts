import { Realtime } from "@upstash/realtime";
import z from "zod/v4";

import { redis } from "./utils/redis";

const schema = {
  discussion: { changed: z.object({ version: z.string() }) },
  ai: { chunk: z.any() as z.ZodType<unknown> },
  // Public demo: every demo-api request and UI action, for the live feed.
  demo: { request: z.any() as z.ZodType<unknown> },
  // GEO live updates on `geo:{orgId}`: clients refetch the matching queries.
  geo: {
    traffic: z.object({ projectIds: z.array(z.string()) }),
    visibility: z.object({
      projectId: z.string(),
      scanId: z.string().nullable(),
      status: z.enum(["started", "progress", "finished"]),
    }),
  },
  mirror: {
    message: z.any() as z.ZodType<unknown>,
    status: z.any() as z.ZodType<unknown>,
  },
};

export const realtime = redis
  ? new Realtime({
      schema,
      redis,
      history: {
        maxLength: 1000,
        expireAfterSecs: 60 * 60,
      },
    })
  : null;

export type RealtimeSchema = typeof schema;
