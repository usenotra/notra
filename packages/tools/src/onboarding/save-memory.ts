import { defineTool } from "eve/tools";

import { MEMORY_SOURCE_TAG } from "../constants/supermemory";
import { saveMemoryInputSchema } from "../schemas/onboarding-tools";
import {
  supermemoryCreateResponseSchema,
  supermemorySearchResponseSchema,
} from "../schemas/supermemory";
import { requireOrganizationId } from "../utils/organization";
import { retryTransientEffect, runToolOperation } from "../utils/retry";
import {
  getOrganizationContainerTag,
  requestSupermemoryEffect,
} from "../utils/supermemory";

export function createSaveMemoryTool() {
  return defineTool({
    description:
      "Save one curated, durable fact about the organization to Supermemory: positioning, tone evidence, audience, covered topics, or competitors. Never raw scrapes.",
    inputSchema: saveMemoryInputSchema,
    async execute({ content, topic }, ctx) {
      const organizationId = requireOrganizationId(ctx);
      const containerTag = getOrganizationContainerTag(organizationId);
      const existingSearch = supermemorySearchResponseSchema.parse(
        await runToolOperation(
          retryTransientEffect(
            requestSupermemoryEffect("/v4/search", {
              q: content,
              searchMode: "memories",
              limit: 5,
              rerank: true,
              containerTag,
              filters: { AND: [{ key: "source", value: MEMORY_SOURCE_TAG }] },
            }),
            { operationName: "Supermemory duplicate check" }
          )
        )
      );
      const existing = existingSearch.results.find(
        (result) =>
          result.memory === content &&
          result.metadata?.source === MEMORY_SOURCE_TAG
      );
      if (existing) {
        return {
          documentId: existing.documentId ?? null,
          memoryId: existing.id ?? null,
          skipped: true,
          topic,
        };
      }

      const response = supermemoryCreateResponseSchema.parse(
        await runToolOperation(
          retryTransientEffect(
            requestSupermemoryEffect("/v4/memories", {
              containerTag,
              memories: [
                {
                  content,
                  metadata: {
                    source: MEMORY_SOURCE_TAG,
                    organizationId,
                    topic,
                  },
                },
              ],
            }),
            { operationName: "Supermemory memory creation" }
          )
        )
      );

      return {
        documentId: response.documentId ?? null,
        memoryId: response.memories?.[0]?.id ?? null,
        skipped: false,
        topic,
      };
    },
  });
}
