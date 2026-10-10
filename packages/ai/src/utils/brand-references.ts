import type { BrandReferenceSummary } from "@notra/ai/types/brand-references";
import type { brandReferences } from "@notra/db/schema";

type BrandReferenceRecord = typeof brandReferences.$inferSelect;

export function serializeBrandReference(
  reference: BrandReferenceRecord
): BrandReferenceSummary {
  return {
    id: reference.id,
    brandIdentityId: reference.brandSettingsId,
    type: reference.type,
    content: reference.content,
    note: reference.note,
    sourceCapturedAt: reference.sourceCapturedAt?.toISOString() ?? null,
    sourceUrl: reference.sourceUrl,
    applicableTo: reference.applicableTo,
    createdAt: reference.createdAt.toISOString(),
    updatedAt: reference.updatedAt.toISOString(),
  };
}
