import { brandSettings } from "@notra/db/schema";
import { Effect } from "effect";
import type { Context } from "hono";

import type { BrandIdentityDatabaseError } from "../errors/brand-identities";
import type {
  BrandIdentityDomainError,
  BrandIdentityRow,
} from "../types/brand-identities";

export function brandIdentityQueryColumns() {
  return {
    id: true,
    name: true,
    isDefault: true,
    websiteUrl: true,
    companyName: true,
    companyDescription: true,
    toneProfile: true,
    customTone: true,
    customInstructions: true,
    audience: true,
    language: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

export function selectBrandIdentityColumns() {
  return {
    id: brandSettings.id,
    name: brandSettings.name,
    isDefault: brandSettings.isDefault,
    websiteUrl: brandSettings.websiteUrl,
    companyName: brandSettings.companyName,
    companyDescription: brandSettings.companyDescription,
    toneProfile: brandSettings.toneProfile,
    customTone: brandSettings.customTone,
    customInstructions: brandSettings.customInstructions,
    audience: brandSettings.audience,
    language: brandSettings.language,
    createdAt: brandSettings.createdAt,
    updatedAt: brandSettings.updatedAt,
  };
}

export function serializeBrandIdentity(brandIdentity: BrandIdentityRow) {
  return {
    ...brandIdentity,
    createdAt: brandIdentity.createdAt.toISOString(),
    updatedAt: brandIdentity.updatedAt.toISOString(),
  };
}

/** Leave unexpected database errors to Hono's central error handler. */
export function runBrandIdentityProgram<A, E extends BrandIdentityDomainError>(
  program: Effect.Effect<A, E | BrandIdentityDatabaseError>
) {
  return Effect.runPromise(
    Effect.result(
      program.pipe(
        Effect.catchTag("BrandIdentityDatabaseError", (failure) =>
          Effect.die(failure.cause)
        )
      )
    )
  );
}

export function respondToBrandIdentityFailure(
  c: Context,
  failure: BrandIdentityDomainError
) {
  if (failure._tag === "BrandIdentityNotFoundError") {
    return c.json({ error: "Brand identity not found" }, 404);
  }

  if (failure._tag === "BrandIdentityNameDuplicateError") {
    return c.json(
      { error: "A brand identity with this name already exists" },
      409
    );
  }

  if (failure._tag === "BrandIdentityCreateFailedError") {
    return c.json({ error: "Failed to create brand identity" }, 409);
  }

  if (failure._tag === "BrandIdentityDefaultDeleteError") {
    return c.json({ error: "Cannot delete the default brand identity" }, 400);
  }

  if (failure._tag === "BrandAnalysisJobNotFoundError") {
    return c.json({ error: "Brand identity analysis job not found" }, 404);
  }

  if (failure._tag === "BrandAnalysisQueueFailedError") {
    return c.json({ error: "Failed to queue brand identity analysis" }, 503);
  }
}
