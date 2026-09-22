import { z } from "zod";

import { reportGeoError } from "../send";
import { FeedbackSubmitError, submitFeedback } from "./client";
import {
  DEFAULT_TOOL_NAME,
  FEEDBACK_KINDS,
  FEEDBACK_SENTIMENTS,
  MESSAGE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "./constants";
import type {
  FeedbackInput,
  FeedbackToolOptions,
  FeedbackToolResult,
  FeedbackToolServer,
} from "./types";

export const feedbackToolInputSchema = {
  message: z
    .string()
    .trim()
    .min(1)
    .max(MESSAGE_MAX_LENGTH)
    .describe("The feedback, bug report, feature request or question"),
  title: z
    .string()
    .trim()
    .min(1)
    .max(TITLE_MAX_LENGTH)
    .optional()
    .describe("Short one-line summary"),
  kind: z
    .enum(FEEDBACK_KINDS)
    .optional()
    .describe("bug, feature, praise, question or other"),
  sentiment: z
    .enum(FEEDBACK_SENTIMENTS)
    .optional()
    .describe("negative, neutral or positive"),
  contextUrl: z
    .string()
    .url()
    .optional()
    .describe("Page, docs URL or resource the feedback is about"),
};

const feedbackToolArgsSchema = z.object(feedbackToolInputSchema);

export const feedbackToolOutputSchema = {
  id: z.string().describe("Identifier of the recorded feedback entry"),
  deduplicated: z
    .boolean()
    .describe("True when identical feedback was already recorded and reused"),
};

export function buildFeedbackToolDescription(productName?: string): string {
  const subject = productName ? `the ${productName} team` : "the product team";
  return `Send feedback about ${productName ?? "this product"} to ${subject}. Use it to report bugs, request features, ask questions or share what worked well. Include the exact steps or URL when reporting a problem.`;
}

function toErrorText(error: unknown): string {
  if (error instanceof FeedbackSubmitError) {
    return `Feedback could not be submitted (${error.status}): ${error.message}`;
  }
  if (error instanceof Error) {
    return `Feedback could not be submitted: ${error.message}`;
  }
  return "Feedback could not be submitted.";
}

export function createFeedbackToolHandler(options: FeedbackToolOptions) {
  return async (args: Record<string, unknown>): Promise<FeedbackToolResult> => {
    const parsed = feedbackToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid feedback: ${parsed.error.issues[0]?.message ?? "check the arguments"}`,
          },
        ],
        isError: true,
      };
    }

    const input: FeedbackInput = {
      ...options.defaults,
      ...parsed.data,
    };

    try {
      const result = await submitFeedback(input, options);
      return {
        content: [
          {
            type: "text",
            text: result.deduplicated
              ? "This feedback was already recorded."
              : "Thanks, the feedback was sent to the team.",
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      reportGeoError(options.onError, error);
      return {
        content: [{ type: "text", text: toErrorText(error) }],
        isError: true,
      };
    }
  };
}

export function registerFeedbackTool(
  server: FeedbackToolServer,
  options: FeedbackToolOptions
) {
  return server.registerTool(
    options.toolName ?? DEFAULT_TOOL_NAME,
    {
      description:
        options.description ??
        buildFeedbackToolDescription(options.productName),
      annotations: {
        title: "Submit feedback",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: feedbackToolInputSchema,
      outputSchema: feedbackToolOutputSchema,
    },
    createFeedbackToolHandler(options)
  );
}
