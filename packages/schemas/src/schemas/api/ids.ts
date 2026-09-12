import "zod/compile";
import { z } from "@hono/zod-openapi";

const RESOURCE_ID_REGEX = /^[A-Za-z0-9_-]{1,100}$/;

export function resourceIdSchema(fieldName: string) {
  return z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(RESOURCE_ID_REGEX, `${fieldName} has an invalid format`);
}
