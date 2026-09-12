import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { invalidateGeoIngestHostsCacheForBrand } from "@notra/geo-core/geo/ingest";
import { and, eq } from "drizzle-orm";

import { DEFAULT_BRAND_CONSTRAINT } from "@/constants/brand";
import type {
  BrandAnalysisStep,
  DefaultBrandSettingsData,
} from "@/types/brand-analysis";
import type {
  ProgressData,
  ProgressStatus,
} from "@/types/hooks/brand-analysis";

function getErrorCandidates(error: unknown) {
  if (!(typeof error === "object" && error !== null)) {
    return [];
  }

  return "cause" in error ? [error, error.cause] : [error];
}

export function isDefaultBrandConstraintViolation(error: unknown) {
  return getErrorCandidates(error).some((candidate) => {
    if (!(typeof candidate === "object" && candidate !== null)) {
      return false;
    }

    if (
      "constraint_name" in candidate &&
      candidate.constraint_name === DEFAULT_BRAND_CONSTRAINT
    ) {
      return true;
    }

    if (
      "constraint" in candidate &&
      candidate.constraint === DEFAULT_BRAND_CONSTRAINT
    ) {
      return true;
    }

    if (candidate instanceof Error) {
      return candidate.message.includes(DEFAULT_BRAND_CONSTRAINT);
    }

    return false;
  });
}

export function getStepFromCurrentStep(
  data: ProgressData
): BrandAnalysisStep | null {
  if (data.currentStep === 1) {
    return "scraping";
  }

  if (data.currentStep === 2) {
    return "extracting";
  }

  if (data.currentStep === 3) {
    return "saving";
  }

  return null;
}

export function getStepFromStatus(
  status: ProgressStatus
): BrandAnalysisStep | null {
  if (status === "scraping" || status === "extracting" || status === "saving") {
    return status;
  }

  return null;
}

export async function updateDefaultBrandSettings(
  organizationId: string,
  brandData: DefaultBrandSettingsData
) {
  const existing = await db.query.brandSettings.findFirst({
    where: and(
      eq(brandSettings.organizationId, organizationId),
      eq(brandSettings.isDefault, true)
    ),
  });

  if (existing) {
    await db
      .update(brandSettings)
      .set(brandData)
      .where(eq(brandSettings.id, existing.id));
    await invalidateGeoIngestHostsCacheForBrand(organizationId, existing.id);
    return;
  }

  await db.insert(brandSettings).values({
    id: crypto.randomUUID(),
    organizationId,
    name: "Default",
    isDefault: true,
    ...brandData,
  });
}
