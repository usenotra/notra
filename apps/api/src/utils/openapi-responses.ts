import { errorResponseSchema } from "@notra/schemas/api/content";
import { rateLimitResponseSchema } from "@notra/schemas/api/responses";

export function errorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  };
}

const rateLimitHeaderDescriptors = {
  "RateLimit-Limit": {
    description: "Maximum requests allowed in the current window.",
    schema: { type: "integer" as const },
  },
  "RateLimit-Remaining": {
    description: "Requests remaining in the current window.",
    schema: { type: "integer" as const },
  },
  "RateLimit-Reset": {
    description: "Seconds until the current window resets.",
    schema: { type: "integer" as const },
  },
  "Retry-After": {
    description: "Seconds the client should wait before retrying.",
    schema: { type: "integer" as const },
  },
};

export function rateLimitResponse(
  limit: number,
  window: string,
  scope = "organization"
) {
  return {
    description: `Rate limit exceeded. This endpoint allows ${limit} requests per ${window} per ${scope}.`,
    headers: rateLimitHeaderDescriptors,
    content: {
      "application/json": {
        schema: rateLimitResponseSchema,
      },
    },
  };
}
