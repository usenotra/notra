import { Realtime } from "@upstash/realtime";
import z from "zod/v4";

import { redis } from "./utils/redis";

const schema = {
  discussion: { changed: z.object({ version: z.string() }) },
  ai: { chunk: z.any() as z.ZodType<unknown> },
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
