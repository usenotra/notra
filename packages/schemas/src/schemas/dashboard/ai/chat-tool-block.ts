import "zod/compile";
import { z } from "zod";

const optionalStringSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : undefined),
  z.string().optional()
);
const optionalNumberSchema = z.preprocess(
  (value) => (typeof value === "number" ? value : undefined),
  z.number().optional()
);
const optionalArraySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value : undefined),
  z.array(z.unknown()).optional()
);

export const STRING_TOOL_FIELDS = [
  "containerTag",
  "content",
  "description",
  "documentId",
  "id",
  "identifier",
  "informationToGet",
  "memory",
  "memoryContent",
  "memoryId",
  "name",
  "postId",
  "projectId",
  "q",
  "query",
  "reason",
  "status",
  "tag",
  "text",
  "title",
  "url",
] as const;

export type StringToolField = (typeof STRING_TOOL_FIELDS)[number];

export const stringToolFieldsSchema = z
  .object({
    containerTag: optionalStringSchema,
    content: optionalStringSchema,
    description: optionalStringSchema,
    documentId: optionalStringSchema,
    id: optionalStringSchema,
    identifier: optionalStringSchema,
    informationToGet: optionalStringSchema,
    memory: optionalStringSchema,
    memoryContent: optionalStringSchema,
    memoryId: optionalStringSchema,
    name: optionalStringSchema,
    postId: optionalStringSchema,
    projectId: optionalStringSchema,
    q: optionalStringSchema,
    query: optionalStringSchema,
    reason: optionalStringSchema,
    status: optionalStringSchema,
    tag: optionalStringSchema,
    text: optionalStringSchema,
    title: optionalStringSchema,
    url: optionalStringSchema,
  })
  .passthrough();

export const pullRequestInputSchema = z
  .object({
    pull_number: optionalNumberSchema,
  })
  .passthrough();

export const pullRequestOutputSchema = z
  .object({
    number: optionalNumberSchema,
    pull_number: optionalNumberSchema,
    repo: optionalStringSchema,
    repository: optionalStringSchema,
  })
  .passthrough();

export const releaseInputSchema = z
  .object({
    tag: optionalStringSchema,
  })
  .passthrough();

export const releaseOutputSchema = z
  .object({
    repo: optionalStringSchema,
    repository: optionalStringSchema,
    tag: optionalStringSchema,
    tag_name: optionalStringSchema,
  })
  .passthrough();

export const commitsByTimeframeInputSchema = z
  .object({
    days: optionalNumberSchema,
  })
  .passthrough();

export const webSearchInputSchema = z
  .object({
    query: optionalStringSchema,
  })
  .passthrough();

const webSearchDataSchema = z
  .object({
    images: optionalArraySchema,
    news: optionalArraySchema,
    web: optionalArraySchema,
  })
  .passthrough();

const webSearchOutputDataSchema = z.preprocess(
  (value) =>
    Array.isArray(value) ||
    (value && typeof value === "object" && !Array.isArray(value))
      ? value
      : undefined,
  z.union([z.array(z.unknown()), webSearchDataSchema]).optional()
);

export const webSearchOutputSchema = z
  .object({
    data: webSearchOutputDataSchema,
    results: optionalArraySchema,
  })
  .passthrough();

export const memoryToolInputSchema = z
  .object({
    command: optionalStringSchema,
    file_text: optionalStringSchema,
    insert_text: optionalStringSchema,
    new_path: optionalStringSchema,
    new_str: optionalStringSchema,
    path: optionalStringSchema,
  })
  .passthrough();

export type MemoryToolInput = z.infer<typeof memoryToolInputSchema>;

const idObjectSchema = z
  .object({
    id: optionalStringSchema,
  })
  .passthrough();
const optionalIdObjectSchema = z.preprocess(
  (value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : undefined,
  idObjectSchema.optional()
);

export const memoryIdentifierInputSchema = z
  .object({
    documentId: optionalStringSchema,
    id: optionalStringSchema,
    memoryId: optionalStringSchema,
  })
  .passthrough();

export const memoryIdentifierOutputSchema = z
  .object({
    document: optionalIdObjectSchema,
    documentId: optionalStringSchema,
    id: optionalStringSchema,
    memory: optionalIdObjectSchema,
    memoryId: optionalStringSchema,
  })
  .passthrough();

export const editMarkdownOutputSchema = z
  .object({
    filename: optionalStringSchema,
    previousMarkdown: optionalStringSchema,
    updatedMarkdown: optionalStringSchema,
    success: z.preprocess(
      (value) => (typeof value === "boolean" ? value : undefined),
      z.boolean().optional()
    ),
  })
  .passthrough();

export const mcpToolMetadataSchema = z
  .object({
    notra: z.preprocess(
      (value) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? value
          : undefined,
      z
        .object({
          label: optionalStringSchema,
          logoDarkUrl: optionalStringSchema,
          logoLightUrl: optionalStringSchema,
          serverId: optionalStringSchema,
          serverName: optionalStringSchema,
          serverUrl: optionalStringSchema,
          toolName: optionalStringSchema,
          actionPhrasePresent: optionalStringSchema,
          actionPhrasePast: optionalStringSchema,
        })
        .passthrough()
        .optional()
    ),
  })
  .passthrough();
