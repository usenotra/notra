"use workflow";

import { SdkError } from "@mendable/firecrawl-js";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { FatalError } from "workflow";
import { db } from "@notra/db/drizzle";
import { brandSettings, organizations } from "@notra/db/schema";
import { firecrawl } from "@/lib/firecrawl";
import { openrouter } from "@/lib/openrouter";
import { redis } from "@/lib/redis";
import { brandSettingsSchema } from "@/utils/schemas/brand";

const PROGRESS_TTL = 300;

type ProgressStatus =
  | "idle"
  | "scraping"
  | "extracting"
  | "saving"
  | "completed"
  | "failed";

interface ProgressData {
  status: ProgressStatus;
  currentStep: number;
  totalSteps: number;
  error?: string;
}

interface ErrorDetail {
  code: string;
  path: string[];
  message: string;
}

async function setProgress(organizationId: string, data: ProgressData) {
  "use step";
  await redis.set(`brand:progress:${organizationId}`, data, {
    ex: PROGRESS_TTL,
  });
}

export async function analyzeBrand(organizationId: string, url: string) {
  "use workflow";
  let status: ProgressStatus = "idle";
  let currentStep = 0;
  const STEP_COUNT = 3;

  try {
    status = "scraping";
    currentStep++;
    await setProgress(organizationId, {
      status,
      currentStep,
      totalSteps: STEP_COUNT,
    });

    const content = await scrapeWebsite(url);

    status = "extracting";
    currentStep++;
    await setProgress(organizationId, {
      status,
      currentStep,
      totalSteps: STEP_COUNT,
    });

    const brandInfo = await extractBrandInfo(content);

    status = "saving";
    currentStep++;
    await setProgress(organizationId, {
      status,
      currentStep,
      totalSteps: STEP_COUNT,
    });

    await saveToDatabase(organizationId, url, brandInfo);

    status = "completed";
    await setProgress(organizationId, {
      status,
      currentStep,
      totalSteps: STEP_COUNT,
    });

    return brandInfo;
  } catch (error) {
    await setProgress(organizationId, {
      status: "failed",
      currentStep,
      totalSteps: STEP_COUNT,
      error: `Unknown error while performing '${status}' step`,
    });

    throw error;
  }
}

async function scrapeWebsite(url: string) {
  "use step";

  try {
    const result = await firecrawl.scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
    });

    return result.markdown ?? "";
  } catch (error) {
    console.error("Error scraping website:", error);

    if (error instanceof SdkError) {
      for (const detail of error.details as ErrorDetail[]) {
        if (detail.message === "Invalid URL") {
          throw new FatalError("Invalid URL");
        }
      }
    }

    throw new Error("Unknown error attempting to scrape website");
  }
}

async function extractBrandInfo(content: string) {
  "use step";

  const { object } = await generateObject({
    model: openrouter("google/gemini-2.0-flash-001"),
    schema: brandSettingsSchema,
    prompt: `Analyze this website content and extract brand identity information.

Website content:
${content}

Extract the following information:
1. companyName: The name of the company
2. companyDescription: A comprehensive description of what the company does, their mission, and what makes them unique (2-4 sentences)
3. toneProfile: The tone of their communication - choose one of: "Conversational", "Professional", "Casual", "Formal"
4. audience: A description of their target audience (1-2 sentences)`,
    system: `You are a brand analyst expert. Your job is to analyze website content and extract key brand identity information. Be thorough but concise. Focus on understanding the company's essence, values, and how they communicate.`,
  });

  return object;
}

interface BrandInfo {
  companyName: string;
  companyDescription: string;
  toneProfile: string;
  customTone?: string | null;
  audience: string;
}

async function saveToDatabase(
  organizationId: string,
  url: string,
  brandInfo: BrandInfo
) {
  "use step";

  await db
    .update(organizations)
    .set({ websiteUrl: url })
    .where(eq(organizations.id, organizationId));

  const existing = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, organizationId),
  });

  if (existing) {
    await db
      .update(brandSettings)
      .set({
        companyName: brandInfo.companyName,
        companyDescription: brandInfo.companyDescription,
        toneProfile: brandInfo.toneProfile,
        customTone: brandInfo.customTone ?? null,
        audience: brandInfo.audience,
      })
      .where(eq(brandSettings.organizationId, organizationId));
  } else {
    await db.insert(brandSettings).values({
      id: crypto.randomUUID(),
      organizationId,
      companyName: brandInfo.companyName,
      companyDescription: brandInfo.companyDescription,
      toneProfile: brandInfo.toneProfile,
      customTone: brandInfo.customTone ?? null,
      audience: brandInfo.audience,
    });
  }
}
