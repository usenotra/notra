import { CODE_RESEARCH_FULL_SHA_PATTERN } from "@notra/ai/constants/code-research";
import { z } from "zod";

const integrationId = z
  .string()
  .describe(
    "The GitHub integrationId of the repository, as listed by the available integrations tool."
  );

const repoPath = z
  .string()
  .optional()
  .describe(
    "Directory or file path relative to the repository root, for example apps/web/src. Omit for the whole repository."
  );

const glob = z
  .string()
  .optional()
  .describe(
    "Optional glob relative to path, for example **/*.tsx or *.md. Use ** to match across directories."
  );

export const openRepositoryInputSchema = z
  .object({
    integrationId,
    branch: z
      .string()
      .optional()
      .describe("Check out this branch instead of the default branch"),
    pullRequestNumber: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Check out the head of this pull request. Works for open and merged pull requests, including unmerged work."
      ),
    commitSha: z
      .string()
      .trim()
      .regex(
        CODE_RESEARCH_FULL_SHA_PATTERN,
        "Use a full 40-character commit SHA"
      )
      .optional()
      .describe("Check out this full 40-character commit SHA"),
  })
  .refine(
    (input) =>
      [input.branch, input.pullRequestNumber, input.commitSha].filter(
        (value) => value !== undefined
      ).length <= 1,
    { message: "Pass at most one of branch, pullRequestNumber, or commitSha." }
  );

export const listRepositoryFilesInputSchema = z.object({
  integrationId,
  path: repoPath,
  glob,
});

export const searchRepositoryInputSchema = z.object({
  integrationId,
  query: z
    .string()
    .min(1)
    .describe(
      "Text to search for. Matched literally unless regex is true. Prefer distinctive identifiers, route segments, UI strings, or config keys."
    ),
  regex: z
    .boolean()
    .default(false)
    .describe("Treat query as an extended regular expression"),
  ignoreCase: z.boolean().default(true),
  path: repoPath,
  glob,
});

export const readRepositoryFileInputSchema = z.object({
  integrationId,
  path: z.string().min(1).describe("File path relative to the repository root"),
  startLine: z.number().int().min(1).default(1),
  endLine: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Last line to read (inclusive). At most 400 lines per call."),
});

export const repositoryHistoryInputSchema = z.object({
  integrationId,
  path: repoPath,
  since: z
    .string()
    .optional()
    .describe(
      "Only commits after this date, for example 2026-09-01 or 2.weeks.ago"
    ),
  grep: z
    .string()
    .optional()
    .describe(
      "Only commits whose message contains this text (case-insensitive)"
    ),
  limit: z.number().int().min(1).max(100).default(30),
});

export const showRepositoryChangeInputSchema = z.object({
  integrationId,
  ref: z
    .string()
    .optional()
    .describe(
      "Commit SHA to show. Omit to diff the checked out branch or pull request against the point where it left the default branch."
    ),
  path: repoPath,
});
