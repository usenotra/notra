import { createHash } from "node:crypto";

import {
  SUPERMEMORY_BASE_URL,
  SUPERMEMORY_CONTAINER_TAG_HASH_LENGTH,
  SUPERMEMORY_CUSTOM_ID_HASH_LENGTH,
  SUPERMEMORY_REQUEST_TIMEOUT_MS,
} from "../constants/supermemory";
import {
  brandReferenceMetadataSchema,
  supermemoryDocumentResponseSchema,
} from "../schemas/supermemory";
import type {
  BrandReferenceMemoryLink,
  BrandReferenceMemoryPayload,
  DeleteBrandReferenceMemoryInput,
  SupermemorySearchResult,
} from "../types/supermemory";

function getApiKey() {
  return process.env.SUPERMEMORY_API_KEY;
}

function getHeaders() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not configured");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  const text = await response.text();
  return text || `${response.status} ${response.statusText}`;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function getBrandReferenceContainerTag(voiceId: string) {
  const voiceHash = createHash("sha256").update(voiceId).digest("hex");
  return `brand_voice_${voiceHash.slice(0, SUPERMEMORY_CONTAINER_TAG_HASH_LENGTH)}`;
}

function getLegacyBrandReferenceContainerTag(voiceId: string) {
  return `brand_voice:${voiceId}`;
}

function getApplicableToMetadataKey(platform: string) {
  switch (platform) {
    case "all":
      return "applicableToAll";
    case "twitter":
      return "applicableToTwitter";
    case "linkedin":
      return "applicableToLinkedin";
    case "blog":
      return "applicableToBlog";
    default:
      return null;
  }
}

function getBrandReferenceSearchResultKey(result: SupermemorySearchResult) {
  const referenceId = getBrandReferenceIdFromSearchResult(result);
  if (referenceId) {
    return `reference:${referenceId}`;
  }
  if (result.id) {
    return `memory:${result.id}`;
  }
  return null;
}

export function buildBrandReferenceMemoryContent(
  payload: BrandReferenceMemoryPayload
) {
  const note = payload.note?.trim();
  const applicableTo = payload.applicableTo.join(", ");

  return [
    "Brand voice reference for social content generation.",
    "Study this sample for tone, vocabulary, sentence length, openings, closings, casing, rhythm, structure, and how technical details are framed.",
    "Do not copy it. Use it only as a style reference.",
    `Reference type: ${payload.type}`,
    `Applicable platforms: ${applicableTo}`,
    note ? `When to use: ${note}` : null,
    payload.sourceUrl ? `Source URL: ${payload.sourceUrl}` : null,
    payload.tweetId ? `Tweet ID: ${payload.tweetId}` : null,
    "Sample:",
    truncateText(payload.content.trim(), 9500),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildBrandReferenceMemoryPayload(input: {
  organizationId: string;
  voiceId: string;
  reference: {
    id: string;
    type: string;
    content: string;
    note: string | null;
    applicableTo: string[];
    metadata: unknown;
    sourceUrl: string | null;
  };
}) {
  const metadata = brandReferenceMetadataSchema.safeParse(
    input.reference.metadata
  );
  return {
    organizationId: input.organizationId,
    voiceId: input.voiceId,
    referenceId: input.reference.id,
    type: input.reference.type,
    content: input.reference.content,
    note: input.reference.note,
    applicableTo: input.reference.applicableTo,
    tweetId: metadata.success ? (metadata.data.tweetId ?? null) : null,
    sourceUrl: input.reference.sourceUrl,
  } satisfies BrandReferenceMemoryPayload;
}

export function getBrandReferenceMemorySyncHash(
  payload: BrandReferenceMemoryPayload
) {
  return createHash("sha256")
    .update(buildBrandReferenceMemoryContent(payload))
    .digest("hex");
}

export function getBrandReferenceMemoryCustomId(
  payload: BrandReferenceMemoryPayload
) {
  const referenceHash = createHash("sha256")
    .update(payload.referenceId)
    .digest("hex");
  const syncHash = getBrandReferenceMemorySyncHash(payload);
  return `brand-reference-${referenceHash.slice(0, SUPERMEMORY_CUSTOM_ID_HASH_LENGTH)}-${syncHash.slice(0, SUPERMEMORY_CUSTOM_ID_HASH_LENGTH)}`;
}

export async function createBrandReferenceMemory(
  payload: BrandReferenceMemoryPayload
): Promise<BrandReferenceMemoryLink> {
  const syncHash = getBrandReferenceMemorySyncHash(payload);
  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v3/documents`, {
    method: "POST",
    headers: getHeaders(),
    signal: AbortSignal.timeout(SUPERMEMORY_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      content: buildBrandReferenceMemoryContent(payload),
      containerTag: getBrandReferenceContainerTag(payload.voiceId),
      customId: getBrandReferenceMemoryCustomId(payload),
      metadata: {
        source: "brand_reference",
        organizationId: payload.organizationId,
        voiceId: payload.voiceId,
        referenceId: payload.referenceId,
        syncHash,
        type: payload.type,
        applicableToAll: payload.applicableTo.includes("all"),
        applicableToBlog: payload.applicableTo.includes("blog"),
        applicableToLinkedin: payload.applicableTo.includes("linkedin"),
        applicableToTwitter: payload.applicableTo.includes("twitter"),
        tweetId: payload.tweetId ?? undefined,
        url: payload.sourceUrl ?? undefined,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create Supermemory reference memory: ${await parseError(response)}`
    );
  }

  const data = supermemoryDocumentResponseSchema.safeParse(
    await response.json()
  );
  if (!data.success) {
    throw new Error(
      "Supermemory returned an invalid reference memory response"
    );
  }

  return {
    documentId: data.data.id,
    memoryId: null,
  };
}

export async function deleteBrandReferenceMemory(
  input: DeleteBrandReferenceMemoryInput
) {
  const identifier = input.documentId ?? input.customId;
  if (!identifier) {
    return;
  }

  const response = await fetch(
    `${SUPERMEMORY_BASE_URL}/v3/documents/${encodeURIComponent(identifier)}`,
    {
      method: "DELETE",
      headers: getHeaders(),
      signal: AbortSignal.timeout(SUPERMEMORY_REQUEST_TIMEOUT_MS),
    }
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to delete Supermemory reference memory: ${await parseError(response)}`
    );
  }
}

export async function searchBrandReferenceMemories(input: {
  voiceId: string;
  query: string;
  applicableTo?: string;
  limit?: number;
}) {
  const limit = input.limit ?? 6;
  const [currentResults, legacyResults] = await Promise.all([
    searchBrandReferenceContainer({
      ...input,
      containerTag: getBrandReferenceContainerTag(input.voiceId),
      legacyMetadata: false,
      limit,
    }),
    searchBrandReferenceContainer({
      ...input,
      containerTag: getLegacyBrandReferenceContainerTag(input.voiceId),
      legacyMetadata: true,
      limit,
    }),
  ]);
  const seen = new Set<string>();

  return [...currentResults, ...legacyResults]
    .sort((left, right) => (right.similarity ?? 0) - (left.similarity ?? 0))
    .filter((result) => {
      const resultKey = getBrandReferenceSearchResultKey(result);

      if (!resultKey || !seen.has(resultKey)) {
        if (resultKey) {
          seen.add(resultKey);
        }
        return true;
      }

      return false;
    })
    .slice(0, limit);
}

async function searchBrandReferenceContainer(input: {
  voiceId: string;
  query: string;
  applicableTo?: string;
  limit: number;
  containerTag: string;
  legacyMetadata: boolean;
}) {
  const applicableToMetadataKey = input.applicableTo
    ? getApplicableToMetadataKey(input.applicableTo)
    : null;
  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v4/search`, {
    method: "POST",
    headers: getHeaders(),
    signal: AbortSignal.timeout(SUPERMEMORY_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      q: input.query,
      searchMode: "hybrid",
      limit: input.limit,
      threshold: 0.2,
      rerank: true,
      containerTag: input.containerTag,
      filters: {
        AND: [
          { key: "source", value: "brand_reference" },
          { key: "voiceId", value: input.voiceId },
          ...(input.applicableTo
            ? [
                {
                  OR: input.legacyMetadata
                    ? [
                        {
                          filterType: "array_contains",
                          key: "applicableTo",
                          value: "all",
                        },
                        {
                          filterType: "array_contains",
                          key: "applicableTo",
                          value: input.applicableTo,
                        },
                      ]
                    : [
                        {
                          key: "applicableToAll",
                          value: "true",
                        },
                        ...(applicableToMetadataKey
                          ? [
                              {
                                key: applicableToMetadataKey,
                                value: "true",
                              },
                            ]
                          : []),
                      ],
                },
              ]
            : []),
        ],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to search Supermemory brand references: ${await parseError(response)}`
    );
  }

  const data = (await response.json()) as {
    results?: SupermemorySearchResult[];
  };

  return data.results ?? [];
}

export function getBrandReferenceIdFromSearchResult(
  result: SupermemorySearchResult
) {
  const referenceId = result.metadata?.referenceId;
  return typeof referenceId === "string" ? referenceId : null;
}
