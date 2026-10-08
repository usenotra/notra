import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { ContextDevScreenshotResponse } from "@notra/ai/types/context-dev";
import {
  formatBrandGuidelineSourceInstructions,
  limitBrandGuidelineSourceText,
} from "@notra/ai/utils/brand-guideline-source";
import {
  captureScreenshot,
  isContextDevConfigured,
  parsePdfDocument,
  retrieveBrand,
  retrieveStyleguide,
} from "@notra/ai/utils/context-dev";
import { db } from "@notra/db/drizzle";
import {
  brandGuidelineAssets,
  brandGuidelineColors,
  brandGuidelineFonts,
  brandGuidelineScreenshots,
  brandGuidelines,
  brandGuidelineTokens,
} from "@notra/db/schema";
import { MAX_BRAND_GUIDELINE_PDF_FILE_SIZE } from "@notra/schemas/constants/dashboard/upload";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import {
  BRAND_GUIDELINE_DESKTOP_SCREENSHOT_CONFIG,
  BRAND_GUIDELINE_MAX_SCREENSHOT_SLICES,
  BRAND_GUIDELINE_SCREENSHOT_WAIT_MS,
  BRAND_GUIDELINE_TRAILING_SLASH_REGEX,
} from "@/constants/brand-guidelines";
import { getR2Config } from "@/lib/upload/r2";
import type {
  BrandGuidelineGenerationStepInput,
  NormalizedScreenshot,
} from "@/types/brand-guidelines";
import {
  dedupeColors,
  extractAssets,
  extractFonts,
  extractLogoColors,
  extractStyleguideColors,
  extractTokens,
  getBrandGuidelineHostname,
  getColorDedupeKey,
  getScreenshotUrl,
  normalizeBrandGuidelineSourceUrl,
  serializeGuidelinesResponse,
} from "@/utils/brand-guidelines";
import {
  extractPdfText,
  MAX_BRAND_GUIDELINE_PDF_PAGES,
} from "@/utils/extract-pdf-text";

function getScreenshotResponseHeight(response: ContextDevScreenshotResponse) {
  return typeof response.screenshot === "object"
    ? response.screenshot.height
    : response.height;
}

async function captureDesktopSlice(
  sourceUrl: string,
  scrollOffset: number,
  viewportHeight = BRAND_GUIDELINE_DESKTOP_SCREENSHOT_CONFIG.height
) {
  const config = BRAND_GUIDELINE_DESKTOP_SCREENSHOT_CONFIG;

  return captureScreenshot({
    directUrl: sourceUrl,
    handleCookiePopup: true,
    maxAgeMs: 0,
    scrollOffset,
    timeoutMS: 60_000,
    viewport: {
      height: viewportHeight,
      width: config.width,
    },
    waitForMs: BRAND_GUIDELINE_SCREENSHOT_WAIT_MS,
  });
}

async function captureDesktopScreenshots(sourceUrl: string) {
  const config = BRAND_GUIDELINE_DESKTOP_SCREENSHOT_CONFIG;
  const seenScreenshotUrls = new Set<string>();
  const responses: {
    response: ContextDevScreenshotResponse;
    scrollOffset: number;
  }[] = [];

  for (let index = 0; index < BRAND_GUIDELINE_MAX_SCREENSHOT_SLICES; index++) {
    const scrollOffset = index * config.height;
    const response = await captureDesktopSlice(sourceUrl, scrollOffset);

    const screenshotUrl = getScreenshotUrl(response);
    if (screenshotUrl) {
      if (seenScreenshotUrls.has(screenshotUrl)) {
        break;
      }
      seenScreenshotUrls.add(screenshotUrl);
    }

    const height = getScreenshotResponseHeight(response);

    if (height === undefined) {
      responses.push({ response, scrollOffset });
      break;
    }

    if (height <= 0) {
      break;
    }

    if (height >= config.height || scrollOffset === 0) {
      responses.push({ response, scrollOffset });
      if (height < config.height) {
        break;
      }
      continue;
    }

    const previous = responses.pop();
    if (!previous) {
      responses.push({ response, scrollOffset });
      break;
    }

    const mergedResponse = await captureDesktopSlice(
      sourceUrl,
      previous.scrollOffset,
      config.height + height
    );
    const mergedUrl = getScreenshotUrl(mergedResponse);
    const mergedHeight = getScreenshotResponseHeight(mergedResponse) ?? 0;

    if (mergedUrl && mergedHeight > config.height) {
      responses.push({
        response: mergedResponse,
        scrollOffset: previous.scrollOffset,
      });
    } else {
      responses.push(previous);
    }
    break;
  }

  return responses;
}

async function getGuidelineByBrandSettingsId(brandSettingsId: string) {
  return db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.brandSettingsId, brandSettingsId),
    with: {
      assets: { orderBy: [asc(brandGuidelineAssets.sortOrder)] },
      colors: { orderBy: [asc(brandGuidelineColors.sortOrder)] },
      fonts: { orderBy: [asc(brandGuidelineFonts.sortOrder)] },
      screenshots: { orderBy: [asc(brandGuidelineScreenshots.sortOrder)] },
      tokens: { orderBy: [asc(brandGuidelineTokens.sortOrder)] },
    },
  });
}

export async function getBrandGuidelines(brandSettingsId: string) {
  return serializeGuidelinesResponse(
    await getGuidelineByBrandSettingsId(brandSettingsId)
  );
}

function resolveGuidelineDomain(sourceUrl: string) {
  return getBrandGuidelineHostname(normalizeBrandGuidelineSourceUrl(sourceUrl));
}

async function requireGuidelineId(brandSettingsId: string) {
  const guideline = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.brandSettingsId, brandSettingsId),
    columns: { id: true },
  });

  if (!guideline) {
    throw new Error("Brand guideline record not found");
  }

  return guideline.id;
}

async function mergeGuidelineMeta(
  guidelineId: string,
  meta: Record<string, unknown>
) {
  const existing = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.id, guidelineId),
    columns: { contextDevMeta: true },
  });
  const current =
    existing?.contextDevMeta &&
    typeof existing.contextDevMeta === "object" &&
    !Array.isArray(existing.contextDevMeta)
      ? (existing.contextDevMeta as Record<string, unknown>)
      : {};

  return { ...current, ...meta };
}

export async function startBrandGuidelineGeneration(brandSettingsId: string) {
  const now = new Date();
  const existing = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.brandSettingsId, brandSettingsId),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(brandGuidelines)
      .set({
        status: "generating",
        lastGenerationError: null,
        updatedAt: now,
      })
      .where(eq(brandGuidelines.id, existing.id));
    return existing.id;
  }

  const guidelineId = crypto.randomUUID();
  await db.insert(brandGuidelines).values({
    id: guidelineId,
    brandSettingsId,
    status: "generating",
    lastGenerationError: null,
    createdAt: now,
    updatedAt: now,
  });
  return guidelineId;
}

export async function applyBrandGuidelineStyleguideStep(
  input: BrandGuidelineGenerationStepInput
) {
  const domain = resolveGuidelineDomain(input.sourceUrl);
  const guidelineId = await requireGuidelineId(input.brandSettingsId);
  const styleguide = await retrieveStyleguide(domain);

  const colors = dedupeColors(extractStyleguideColors(styleguide));
  const fonts = extractFonts(styleguide);
  const tokens = extractTokens(styleguide);
  const contextDevMeta = await mergeGuidelineMeta(guidelineId, {
    styleguide: { code: styleguide.code, status: styleguide.status },
  });
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(brandGuidelineColors)
      .where(eq(brandGuidelineColors.guidelineId, guidelineId));
    await tx
      .delete(brandGuidelineFonts)
      .where(eq(brandGuidelineFonts.guidelineId, guidelineId));
    await tx
      .delete(brandGuidelineTokens)
      .where(eq(brandGuidelineTokens.guidelineId, guidelineId));

    if (colors.length > 0) {
      await tx.insert(brandGuidelineColors).values(
        colors.map((color) => ({
          id: crypto.randomUUID(),
          guidelineId,
          ...color,
        }))
      );
    }

    if (fonts.length > 0) {
      await tx.insert(brandGuidelineFonts).values(
        fonts.map((font) => ({
          id: crypto.randomUUID(),
          guidelineId,
          ...font,
        }))
      );
    }

    if (tokens.length > 0) {
      await tx.insert(brandGuidelineTokens).values(
        tokens.map((token) => ({
          id: crypto.randomUUID(),
          guidelineId,
          ...token,
        }))
      );
    }

    await tx
      .update(brandGuidelines)
      .set({ contextDevMeta, updatedAt: now })
      .where(eq(brandGuidelines.id, guidelineId));
  });

  return {
    colorCount: colors.length,
    fontCount: fonts.length,
    tokenCount: tokens.length,
  };
}

export async function applyBrandGuidelineBrandStep(
  input: BrandGuidelineGenerationStepInput
) {
  const domain = resolveGuidelineDomain(input.sourceUrl);
  const guidelineId = await requireGuidelineId(input.brandSettingsId);
  const brand = await retrieveBrand(domain);

  const assets = extractAssets(brand);
  const existingColors = await db.query.brandGuidelineColors.findMany({
    where: eq(brandGuidelineColors.guidelineId, guidelineId),
    columns: { role: true, lightValue: true, darkValue: true },
  });
  const existingColorKeys = new Set(existingColors.map(getColorDedupeKey));
  const logoColors = dedupeColors(
    extractLogoColors(brand, existingColors.length)
  ).filter((color) => !existingColorKeys.has(getColorDedupeKey(color)));
  const contextDevMeta = await mergeGuidelineMeta(guidelineId, {
    brand: { code: brand.code, status: brand.status },
  });
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(brandGuidelineAssets)
      .where(eq(brandGuidelineAssets.guidelineId, guidelineId));

    if (assets.length > 0) {
      await tx.insert(brandGuidelineAssets).values(
        assets.map((asset) => ({
          id: crypto.randomUUID(),
          guidelineId,
          ...asset,
        }))
      );
    }

    if (logoColors.length > 0) {
      await tx.insert(brandGuidelineColors).values(
        logoColors.map((color) => ({
          id: crypto.randomUUID(),
          guidelineId,
          ...color,
        }))
      );
    }

    await tx
      .update(brandGuidelines)
      .set({ contextDevMeta, updatedAt: now })
      .where(eq(brandGuidelines.id, guidelineId));
  });

  return { assetCount: assets.length, logoColorCount: logoColors.length };
}

export async function applyBrandGuidelineScreenshotsStep(
  input: BrandGuidelineGenerationStepInput
) {
  const guidelineId = await requireGuidelineId(input.brandSettingsId);
  const screenshotResponses = await captureDesktopScreenshots(input.sourceUrl);
  const capturedAt = new Date();
  const config = BRAND_GUIDELINE_DESKTOP_SCREENSHOT_CONFIG;

  const slices = screenshotResponses.map(
    ({ response, scrollOffset }, index) => {
      const url = getScreenshotUrl(response);

      if (!url) {
        throw new Error(
          `Screenshot capture did not return an image for ${config.kind}`
        );
      }

      return {
        format:
          (typeof response.screenshot === "object"
            ? response.screenshot.format
            : undefined) ?? "png",
        height:
          (typeof response.screenshot === "object"
            ? response.screenshot.height
            : response.height) ?? config.height,
        index,
        scrollOffset,
        screenshotType: response.screenshotType,
        url,
        width:
          (typeof response.screenshot === "object"
            ? response.screenshot.width
            : response.width) ?? config.width,
      };
    }
  );

  const firstSlice = slices[0];
  const screenshots: NormalizedScreenshot[] = firstSlice
    ? [
        {
          capturedAt,
          format: firstSlice.format,
          fullPage: config.fullPage,
          height: firstSlice.height,
          kind: config.kind,
          metadata: {
            code: screenshotResponses[0]?.response.code,
            domain: screenshotResponses[0]?.response.domain,
            scrollOffset: firstSlice.scrollOffset,
            slices,
            status: screenshotResponses[0]?.response.status,
          },
          sortOrder: config.sortOrder,
          storageKey: null,
          url: firstSlice.url,
          width: firstSlice.width,
        },
      ]
    : [];

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(brandGuidelineScreenshots)
      .where(eq(brandGuidelineScreenshots.guidelineId, guidelineId));

    if (screenshots.length > 0) {
      await tx.insert(brandGuidelineScreenshots).values(
        screenshots.map((screenshot) => ({
          id: crypto.randomUUID(),
          guidelineId,
          ...screenshot,
        }))
      );
    }
  });

  await db
    .update(brandGuidelines)
    .set({
      status: "ready",
      lastGeneratedAt: now,
      lastGenerationError: null,
      updatedAt: now,
    })
    .where(eq(brandGuidelines.id, guidelineId));

  return { screenshotCount: screenshots.length, sliceCount: slices.length };
}

export async function markBrandGuidelinesFailed(input: {
  brandSettingsId: string;
  error: string;
}) {
  const now = new Date();
  const existing = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.brandSettingsId, input.brandSettingsId),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(brandGuidelines)
      .set({
        status: "failed",
        lastGenerationError: input.error,
        updatedAt: now,
      })
      .where(eq(brandGuidelines.id, existing.id));
    return;
  }

  await db.insert(brandGuidelines).values({
    id: crypto.randomUUID(),
    brandSettingsId: input.brandSettingsId,
    status: "failed",
    lastGenerationError: input.error,
    createdAt: now,
    updatedAt: now,
  });
}

export class BrandGuidelineSourcePdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrandGuidelineSourcePdfValidationError";
  }
}

function assertGuidelinePdfKey(organizationId: string, key: string) {
  const prefix = `organization/${organizationId}/brand-guidelines/`;
  if (
    !(
      key.startsWith(prefix) &&
      key.toLowerCase().endsWith(".pdf") &&
      !key.includes("..")
    )
  ) {
    throw new BrandGuidelineSourcePdfValidationError(
      "Invalid brand guideline file"
    );
  }
}

function assertGuidelinePdfFilename(filename: string) {
  const trimmed = filename.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new BrandGuidelineSourcePdfValidationError(
      "PDF filename must be between 1 and 200 characters"
    );
  }
  if (!trimmed.toLowerCase().endsWith(".pdf")) {
    throw new BrandGuidelineSourcePdfValidationError(
      "Brand guideline file must be a PDF"
    );
  }
}

async function deleteStoredGuidelinePdf(key: string | null) {
  if (!key) {
    return;
  }

  const { bucketName, client } = getR2Config();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

async function isGuidelinePdfReferenced(key: string | null) {
  if (!key) {
    return false;
  }
  const referencing = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.sourcePdfStorageKey, key),
    columns: { id: true },
  });
  return !!referencing;
}

async function deleteStoredGuidelinePdfIfUnreferenced(key: string | null) {
  if (!key) {
    return;
  }
  if (await isGuidelinePdfReferenced(key)) {
    console.warn("Skipping guideline PDF delete: still referenced", { key });
    return;
  }
  await deleteStoredGuidelinePdf(key);
}

async function readGuidelinePdfText(
  bytes: Uint8Array,
  publicUrl: string
): Promise<string> {
  if (isContextDevConfigured()) {
    try {
      const parsed = await parsePdfDocument({ url: publicUrl });
      if (
        parsed.pageCount !== null &&
        parsed.pageCount > MAX_BRAND_GUIDELINE_PDF_PAGES
      ) {
        throw new BrandGuidelineSourcePdfValidationError(
          `This PDF has ${parsed.pageCount} pages. Export a shorter guideline under ${MAX_BRAND_GUIDELINE_PDF_PAGES} pages and try again.`
        );
      }
      return parsed.text;
    } catch (error) {
      if (error instanceof BrandGuidelineSourcePdfValidationError) {
        throw error;
      }
      console.error("Context PDF parse failed, using local extraction", {
        error,
      });
    }
  }
  return extractPdfText(bytes);
}

export async function attachBrandGuidelineSourcePdf(input: {
  brandSettingsId: string;
  filename: string;
  key: string;
  organizationId: string;
}) {
  assertGuidelinePdfKey(input.organizationId, input.key);
  assertGuidelinePdfFilename(input.filename);
  const { bucketName, client, publicUrl } = getR2Config();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: input.key,
    })
  );
  if (!response.Body) {
    await deleteStoredGuidelinePdf(input.key).catch((error) => {
      console.error("Failed to delete orphaned guideline PDF", {
        key: input.key,
        error,
      });
    });
    throw new BrandGuidelineSourcePdfValidationError("Uploaded PDF is empty");
  }

  const bytes = await response.Body.transformToByteArray();
  if (bytes.byteLength > MAX_BRAND_GUIDELINE_PDF_FILE_SIZE) {
    await deleteStoredGuidelinePdf(input.key).catch((error) => {
      console.error("Failed to delete oversize guideline PDF", {
        key: input.key,
        error,
      });
    });
    throw new BrandGuidelineSourcePdfValidationError(
      `Brand guideline PDF must be less than ${MAX_BRAND_GUIDELINE_PDF_FILE_SIZE / 1024 / 1024}MB`
    );
  }
  const sourcePdfUrl = `${publicUrl.replace(BRAND_GUIDELINE_TRAILING_SLASH_REGEX, "")}/${input.key}`;
  let text = "";
  try {
    text = limitBrandGuidelineSourceText(
      await readGuidelinePdfText(bytes, sourcePdfUrl)
    );
  } catch (error) {
    await deleteStoredGuidelinePdf(input.key).catch((cleanupError) => {
      console.error("Failed to delete guideline PDF after extraction failure", {
        key: input.key,
        error: cleanupError,
      });
    });
    if (error instanceof BrandGuidelineSourcePdfValidationError) {
      throw error;
    }
    throw new BrandGuidelineSourcePdfValidationError(
      error instanceof Error ? error.message : "Failed to read the PDF"
    );
  }
  if (!text) {
    await deleteStoredGuidelinePdf(input.key).catch((cleanupError) => {
      console.error("Failed to delete guideline PDF with no text", {
        key: input.key,
        error: cleanupError,
      });
    });
    throw new BrandGuidelineSourcePdfValidationError(
      "This PDF has no extractable text. Export it as a text-based PDF and try again."
    );
  }

  const now = new Date();
  const values = {
    sourcePdfFilename: input.filename.trim(),
    sourcePdfStorageKey: input.key,
    sourcePdfText: text,
    sourcePdfUploadedAt: now,
    sourcePdfUrl,
    updatedAt: now,
  };

  // Serialize replaces per voice: read, upsert, and winner check run under
  // one advisory lock so a concurrent replace cannot slip between the
  // re-read and the cleanup and orphan the loser's file. R2 deletes stay
  // outside the lock.
  let outcome:
    | { ok: false; error: unknown }
    | { ok: true; replacedKey: string | null; won: boolean };
  try {
    outcome = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`brand-guideline-pdf:${input.brandSettingsId}`}))`
      );
      const existing = await tx.query.brandGuidelines.findFirst({
        where: eq(brandGuidelines.brandSettingsId, input.brandSettingsId),
        columns: { id: true, sourcePdfStorageKey: true },
      });
      try {
        await tx
          .insert(brandGuidelines)
          .values({
            id: existing?.id ?? crypto.randomUUID(),
            brandSettingsId: input.brandSettingsId,
            createdAt: now,
            // PDF-only rows have never generated: keep `queued` so the UI
            // shows the "No guidelines yet / Generate" empty state.
            status: "queued",
            ...values,
          })
          .onConflictDoUpdate({
            target: brandGuidelines.brandSettingsId,
            set: values,
          });
      } catch (error) {
        return { ok: false as const, error };
      }
      const current = await tx.query.brandGuidelines.findFirst({
        where: eq(brandGuidelines.brandSettingsId, input.brandSettingsId),
        columns: { sourcePdfStorageKey: true },
      });
      return {
        ok: true as const,
        replacedKey: existing?.sourcePdfStorageKey ?? null,
        won: current?.sourcePdfStorageKey === input.key,
      };
    });
  } catch (error) {
    // The row state is unknown here (the upsert may have committed before
    // the failure), so only delete when nothing references the key.
    await deleteStoredGuidelinePdfIfUnreferenced(input.key).catch(
      (cleanupError) => {
        console.error("Failed to delete guideline PDF after DB failure", {
          key: input.key,
          error: cleanupError,
        });
      }
    );
    throw error;
  }

  if (!outcome.ok) {
    await deleteStoredGuidelinePdfIfUnreferenced(input.key).catch(
      (cleanupError) => {
        console.error("Failed to delete guideline PDF after DB failure", {
          key: input.key,
          error: cleanupError,
        });
      }
    );
    throw outcome.error;
  }

  if (!outcome.won) {
    await deleteStoredGuidelinePdfIfUnreferenced(input.key).catch(
      (cleanupError) => {
        console.error("Failed to delete superseded guideline PDF", {
          key: input.key,
          error: cleanupError,
        });
      }
    );
    return getBrandGuidelines(input.brandSettingsId);
  }

  if (outcome.replacedKey && outcome.replacedKey !== input.key) {
    await deleteStoredGuidelinePdfIfUnreferenced(outcome.replacedKey).catch(
      (cleanupError) => {
        console.error("Failed to delete replaced guideline PDF", {
          key: outcome.replacedKey,
          error: cleanupError,
        });
      }
    );
  }

  return getBrandGuidelines(input.brandSettingsId);
}

export async function removeBrandGuidelineSourcePdf(brandSettingsId: string) {
  const existing = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.brandSettingsId, brandSettingsId),
    columns: { id: true, sourcePdfStorageKey: true },
  });
  if (!existing) {
    return getBrandGuidelines(brandSettingsId);
  }

  const stillStoredKey = existing.sourcePdfStorageKey
    ? eq(brandGuidelines.sourcePdfStorageKey, existing.sourcePdfStorageKey)
    : isNull(brandGuidelines.sourcePdfStorageKey);
  const cleared = await db
    .update(brandGuidelines)
    .set({
      sourcePdfFilename: null,
      sourcePdfStorageKey: null,
      sourcePdfText: null,
      sourcePdfUploadedAt: null,
      sourcePdfUrl: null,
      updatedAt: new Date(),
    })
    .where(and(eq(brandGuidelines.id, existing.id), stillStoredKey))
    .returning({ id: brandGuidelines.id });
  if (cleared.length === 0) {
    return getBrandGuidelines(brandSettingsId);
  }
  // DB is already cleared: never fail the removal on a flaky R2 delete.
  await deleteStoredGuidelinePdfIfUnreferenced(
    existing.sourcePdfStorageKey
  ).catch((error) => {
    console.error("Failed to delete removed guideline PDF", {
      key: existing.sourcePdfStorageKey,
      error,
    });
  });
  return getBrandGuidelines(brandSettingsId);
}

export async function discardBrandGuidelineSourcePdf(input: {
  key: string;
  organizationId: string;
}) {
  // Deletes an uploaded PDF that was never attached.
  assertGuidelinePdfKey(input.organizationId, input.key);
  await deleteStoredGuidelinePdfIfUnreferenced(input.key).catch((error) => {
    console.error("Failed to discard unattached guideline PDF", {
      key: input.key,
      error,
    });
  });
}

async function loadBrandGuidelineSourceInstructions(
  brandSettingsId: string | undefined
) {
  if (!brandSettingsId) {
    return "";
  }

  const row = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.brandSettingsId, brandSettingsId),
    columns: { sourcePdfText: true },
  });
  return formatBrandGuidelineSourceInstructions(row?.sourcePdfText);
}

export async function loadBrandGuidelineSourceInstructionsSafely(
  brandSettingsId: string | undefined
) {
  try {
    return await loadBrandGuidelineSourceInstructions(brandSettingsId);
  } catch (error) {
    console.error("Failed to load brand guideline source", {
      brandSettingsId,
      error,
    });
    return "";
  }
}
