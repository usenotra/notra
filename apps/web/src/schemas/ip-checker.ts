// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

const IP_MAX_LENGTH = 64;

export const ipCheckRequestSchema = z.object({
  ip: z
    .string()
    .trim()
    .min(1, "Enter an IP address.")
    .max(IP_MAX_LENGTH, "That does not look like an IP address."),
});

const crawlerCategorySchema = z.enum([
  "training-crawler",
  "search-index",
  "assistant-browse",
]);

const crawlerAgentSchema = z.object({
  name: z.string(),
  category: crawlerCategorySchema,
});

const ipCheckMatchSchema = z.object({
  sourceId: z.string(),
  vendor: z.string(),
  iconEngine: z.string(),
  agents: z.array(crawlerAgentSchema),
  range: z.string(),
  listUrl: z.string(),
  docs: z.string(),
  listUpdatedAt: z.string().nullable(),
});

const ipCheckEasterEggSchema = z.object({
  ip: z.string(),
  iconEngine: z.string(),
  title: z.string(),
  body: z.string(),
});

export const ipCheckResultSchema = z.object({
  ip: z.string(),
  version: z.enum(["v4", "v6"]),
  easterEgg: ipCheckEasterEggSchema.nullable(),
  matches: z.array(ipCheckMatchSchema),
  listsChecked: z.number(),
  listsTotal: z.number(),
  listsUnavailable: z.array(z.string()),
});

export const crawlerIpListPayloadSchema = z.object({
  creationTime: z.string().optional(),
  prefixes: z.array(
    z.object({
      ipv4Prefix: z.string().optional(),
      ipv6Prefix: z.string().optional(),
    })
  ),
});

export const ipCheckerSearchSchema = z.object({
  ip: z
    .union([z.string(), z.number().transform(String)])
    .optional()
    .catch(undefined),
});
