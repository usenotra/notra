import { defineTool } from "eve/tools";

import { searchMemoryInputSchema } from "../schemas/onboarding-tools";
import { supermemorySearchResponseSchema } from "../schemas/supermemory";
import { requireOrganizationId } from "../utils/organization";
import { retryTransientEffect, runToolOperation } from "../utils/retry";
import {
  getOrganizationContainerTag,
  requestSupermemoryEffect,
} from "../utils/supermemory";

export function createSearchMemoryTool() {
  return defineTool({
    description:
      "Search the organization's Supermemory for existing facts before saving new ones or making claims about what is already known.",
    inputSchema: searchMemoryInputSchema,
    async execute({ query, limit }, ctx) {
      const organizationId = requireOrganizationId(ctx);
      const response = supermemorySearchResponseSchema.parse(
        await runToolOperation(
          retryTransientEffect(
            requestSupermemoryEffect("/v4/search", {
              q: query,
              searchMode: "hybrid",
              limit,
              rerank: true,
              containerTag: getOrganizationContainerTag(organizationId),
            }),
            { operationName: "Supermemory search" }
          )
        )
      );

      return {
        results: response.results.map((result) => ({
          documentId: result.documentId ?? null,
          content:
            result.memory ??
            result.chunk ??
            result.chunks
              ?.filter((chunk) => chunk.isRelevant !== false)
              .map((chunk) => chunk.content)
              .filter(Boolean)
              .join("\n") ??
            null,
          score: result.similarity ?? result.score ?? null,
        })),
      };
    },
  });
}
