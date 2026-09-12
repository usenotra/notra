import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  AGENT_FEEDBACK_IDEMPOTENCY_KEY_MAX_LENGTH,
  AGENT_FEEDBACK_KINDS,
  AGENT_FEEDBACK_MESSAGE_MAX_LENGTH,
  AGENT_FEEDBACK_METADATA_MAX_BYTES,
  AGENT_FEEDBACK_SENTIMENTS,
  AGENT_FEEDBACK_SHORT_FIELD_MAX_LENGTH,
  AGENT_FEEDBACK_SOURCES,
  AGENT_FEEDBACK_STATUSES,
  AGENT_FEEDBACK_TITLE_MAX_LENGTH,
  AGENT_FEEDBACK_URL_MAX_LENGTH,
} from "@notra/db/constants/agent-feedback";

import {
  FEEDBACK_LIST_DEFAULT_LIMIT,
  FEEDBACK_LIST_MAX_LIMIT,
} from "../../constants/feedback";
import { resourceIdSchema } from "./ids";

const ORGANIZATION_SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

const feedbackKindSchema = z.enum(AGENT_FEEDBACK_KINDS).openapi({
  description: "What kind of feedback this is.",
  example: "bug",
});

const feedbackSentimentSchema = z.enum(AGENT_FEEDBACK_SENTIMENTS).openapi({
  description: "Overall sentiment of the feedback.",
  example: "negative",
});

const feedbackStatusSchema = z.enum(AGENT_FEEDBACK_STATUSES).openapi({
  description: "Triage status.",
  example: "new",
});

const feedbackSourceSchema = z.enum(AGENT_FEEDBACK_SOURCES).openapi({
  description: "Channel the feedback arrived through.",
  example: "mcp",
});

const shortFieldSchema = z
  .string()
  .trim()
  .min(1)
  .max(AGENT_FEEDBACK_SHORT_FIELD_MAX_LENGTH);

const metadataSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) =>
      JSON.stringify(value).length <= AGENT_FEEDBACK_METADATA_MAX_BYTES,
    `metadata must be ${AGENT_FEEDBACK_METADATA_MAX_BYTES} bytes or fewer`
  )
  .openapi({
    description: "Arbitrary JSON attached to the feedback, up to 8 KB.",
  });

export const submitFeedbackRequestSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "message is required")
      .max(
        AGENT_FEEDBACK_MESSAGE_MAX_LENGTH,
        `message must be ${AGENT_FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer`
      )
      .openapi({
        description: "The feedback itself.",
        example: "The search tool times out when the query has quotes.",
      }),
    title: z
      .string()
      .trim()
      .min(1)
      .max(AGENT_FEEDBACK_TITLE_MAX_LENGTH)
      .optional()
      .openapi({
        description: "Short summary. When omitted, Notra writes one.",
        example: "Search times out on quoted queries",
      }),
    kind: feedbackKindSchema.optional().openapi({
      description:
        "What kind of feedback this is. When omitted, Notra classifies it.",
    }),
    sentiment: feedbackSentimentSchema.optional().openapi({
      description:
        "Overall sentiment. When omitted, Notra classifies it from the message.",
    }),
    source: feedbackSourceSchema.default("api"),
    projectId: resourceIdSchema("projectId").optional().openapi({
      description: "Project to file the feedback under.",
    }),
    agentClient: shortFieldSchema.optional().openapi({
      description: "The agent or client that submitted the feedback.",
      example: "claude-code",
    }),
    agentModel: shortFieldSchema.optional().openapi({
      example: "claude-opus-5",
    }),
    toolVersion: shortFieldSchema.optional().openapi({ example: "1.2.0" }),
    userAgent: z
      .string()
      .trim()
      .min(1)
      .max(AGENT_FEEDBACK_URL_MAX_LENGTH)
      .optional(),
    contextUrl: z
      .string()
      .trim()
      .url()
      .max(AGENT_FEEDBACK_URL_MAX_LENGTH)
      .optional()
      .openapi({
        description: "Page or resource the feedback is about.",
        example: "https://docs.example.com/api/search",
      }),
    externalId: shortFieldSchema.optional().openapi({
      description: "Your own identifier for the user or session.",
    }),
    idempotencyKey: z
      .string()
      .trim()
      .min(1)
      .max(AGENT_FEEDBACK_IDEMPOTENCY_KEY_MAX_LENGTH)
      .optional()
      .openapi({
        description:
          "Submitting the same key twice returns the original feedback instead of creating a duplicate.",
      }),
    metadata: metadataSchema.optional(),
  })
  .openapi("SubmitFeedbackRequest");

export const feedbackOrganizationParamsSchema = z.object({
  organizationSlug: z
    .string()
    .trim()
    .min(1, "organizationSlug is required")
    .max(63)
    .regex(ORGANIZATION_SLUG_REGEX, "organizationSlug has an invalid format")
    .openapi({
      param: { in: "path", name: "organizationSlug" },
      description:
        "Your organization slug, as shown in your feedback URL on the Feedback page.",
      example: "acme",
    }),
});

export const feedbackParamsSchema = z.object({
  feedbackId: resourceIdSchema("feedbackId").openapi({
    param: { in: "path", name: "feedbackId" },
    example: "fb_123",
  }),
});

export const listFeedbackQuerySchema = z.object({
  status: feedbackStatusSchema.optional(),
  kind: feedbackKindSchema.optional(),
  projectId: resourceIdSchema("projectId").optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(FEEDBACK_LIST_MAX_LIMIT)
    .default(FEEDBACK_LIST_DEFAULT_LIMIT)
    .openapi({ description: "Items per page", example: 25 }),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .openapi({ description: "Page number", example: 1 }),
});

export const updateFeedbackRequestSchema = z
  .object({
    status: feedbackStatusSchema,
  })
  .openapi("UpdateFeedbackRequest");

const feedbackSchema = z
  .object({
    id: z.string(),
    projectId: z.string().nullable(),
    source: feedbackSourceSchema,
    kind: feedbackKindSchema,
    sentiment: feedbackSentimentSchema.nullable(),
    status: feedbackStatusSchema,
    title: z.string().nullable(),
    message: z.string(),
    agentClient: z.string().nullable(),
    agentModel: z.string().nullable(),
    toolVersion: z.string().nullable(),
    userAgent: z.string().nullable(),
    contextUrl: z.string().nullable(),
    externalId: z.string().nullable(),
    idempotencyKey: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    resolvedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Feedback");

export const submitFeedbackResponseSchema = z
  .object({
    feedback: feedbackSchema,
    deduplicated: z.boolean().openapi({
      description:
        "True when an existing feedback with the same idempotencyKey was returned.",
    }),
  })
  .openapi("SubmitFeedbackResponse");

const feedbackPaginationSchema = z.object({
  limit: z.number().int().min(1),
  currentPage: z.number().int().min(1),
  nextPage: z.number().int().min(1).nullable(),
  previousPage: z.number().int().min(1).nullable(),
  totalPages: z.number().int().min(1),
  totalItems: z.number().int().min(0),
});

export const listFeedbackResponseSchema = z
  .object({
    feedback: z.array(feedbackSchema),
    pagination: feedbackPaginationSchema,
  })
  .openapi("ListFeedbackResponse");

export const feedbackResponseSchema = z
  .object({
    feedback: feedbackSchema,
  })
  .openapi("FeedbackResponse");
