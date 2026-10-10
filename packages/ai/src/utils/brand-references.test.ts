import { describe, expect, test } from "bun:test";

import { serializeBrandReference } from "./brand-references";

const reference = {
  id: "reference-1",
  brandSettingsId: "voice-1",
  type: "custom",
  content:
    "Write clearly. Preserve verified facts and avoid exaggerated claims.",
  note: "Company voice",
  sourceUrl: "https://example.invalid/posts/1",
  sourceContentHash: "abc123".repeat(11),
  sourceSnapshotKey: "references/org-1/voice-1/1/source-snapshot.json",
  sourceCapturedAt: new Date("2026-10-10T12:00:00.000Z"),
  applicableTo: ["all"],
  createdAt: new Date("2026-10-10T12:00:00.000Z"),
  updatedAt: new Date("2026-10-10T12:00:00.000Z"),
  metadata: null,
  supermemoryDocumentId: null,
  supermemoryMemoryId: null,
  supermemorySyncedAt: null,
  supermemoryLastSyncError: null,
} satisfies Parameters<typeof serializeBrandReference>[0];

describe("AI-facing brand references", () => {
  test("omits only storage locators without changing the source record", () => {
    const before = structuredClone(reference);
    expect(serializeBrandReference(reference)).toEqual({
      id: reference.id,
      brandIdentityId: reference.brandSettingsId,
      type: reference.type,
      content: reference.content,
      note: reference.note,
      sourceUrl: reference.sourceUrl,
      sourceCapturedAt: reference.sourceCapturedAt.toISOString(),
      applicableTo: reference.applicableTo,
      createdAt: reference.createdAt.toISOString(),
      updatedAt: reference.updatedAt.toISOString(),
    });
    expect(reference).toEqual(before);
  });

  test("preserves missing optional source data and complete writing samples", () => {
    const content = 'Full writing sample with "quotes",\nnewlines, and 日本語.';
    const result = serializeBrandReference({
      ...reference,
      content,
      note: null,
      sourceUrl: null,
      sourceCapturedAt: null,
      sourceContentHash: null,
      sourceSnapshotKey: null,
    });
    expect(result).toMatchObject({
      content,
      note: null,
      sourceUrl: null,
      sourceCapturedAt: null,
    });
    expect(result).not.toHaveProperty("sourceContentHash");
    expect(result).not.toHaveProperty("sourceSnapshotKey");
  });

  test("benchmarks the pre-change payload against the production serializer", () => {
    const records = Array.from({ length: 10 }, (_, index) => ({
      ...reference,
      id: `reference-${index}`,
      sourceUrl: `https://example.invalid/posts/${index}`,
      sourceSnapshotKey: `references/org-1/voice-1/${index}/source-snapshot.json`,
    }));
    const candidate = {
      brandIdentityId: "voice-1",
      references: records.map(serializeBrandReference),
      count: records.length,
      total: records.length,
    };
    // Reproduce the old AI serializer, not a second candidate implementation.
    const baseline = {
      ...candidate,
      references: candidate.references.map((serialized, index) => ({
        ...serialized,
        sourceContentHash: records[index]?.sourceContentHash,
        sourceSnapshotKey: records[index]?.sourceSnapshotKey,
      })),
    };
    const baselineBytes = Buffer.byteLength(JSON.stringify(baseline));
    const candidateBytes = Buffer.byteLength(JSON.stringify(candidate));
    expect(baselineBytes - candidateBytes).toBe(1590);
    expect(candidate.references.map((item) => item.id)).toEqual(
      records.map((item) => item.id)
    );
    expect(candidate.references.map((item) => item.content)).toEqual(
      records.map((item) => item.content)
    );
    console.info("Offline brand-reference benchmark", {
      baselineBytes,
      candidateBytes,
      savedBytes: baselineBytes - candidateBytes,
      providerCalls: { baseline: 0, candidate: 0 },
    });
  });
});
