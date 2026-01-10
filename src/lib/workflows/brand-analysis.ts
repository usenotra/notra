"use workflow";

import { SdkError } from "@mendable/firecrawl-js";
import { generateObject } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { FatalError } from "workflow";
import { firecrawl } from "@/lib/firecrawl";
import { openrouter } from "@/lib/openrouter";
import { brandSettingsSchema } from "@/utils/schemas/brand";
import { api } from "../../../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}
const convex = new ConvexHttpClient(CONVEX_URL);

type ProgressStatus =
  | "idle"
  | "scraping"
  | "extracting"
  | "saving"
  | "completed"
  | "failed";

interface ErrorDetail {
  code: string;
  path: string[];
  message: string;
}

type ConvexProgressStatus = "idle" | "analyzing" | "completed" | "failed";

function mapStatusToConvex(status: ProgressStatus): ConvexProgressStatus {
  if (status === "scraping" || status === "extracting" || status === "saving") {
    return "analyzing";
  }
  return status as ConvexProgressStatus;
}

async function setProgress(
  organizationId: string,
  status: ProgressStatus,
  currentStep: number,
  error?: string
) {
  "use step";
  await convex.mutation(api.brand.setProgress, {
    organizationId,
    status: mapStatusToConvex(status),
    progress: currentStep,
    error,
  });
}

export async function analyzeBrand(organizationId: string, url: string) {
  "use workflow";
  let status: ProgressStatus = "idle";
  let currentStep = 0;
  const _STEP_COUNT = 3;

  try {
    status = "scraping";
    currentStep++;
    await setProgress(organizationId, status, currentStep);

    const content = await scrapeWebsite(url);

    status = "extracting";
    currentStep++;
    await setProgress(organizationId, status, currentStep);

    const brandInfo = await extractBrandInfo(content);

    status = "saving";
    currentStep++;
    await setProgress(organizationId, status, currentStep);

    await saveToDatabase(organizationId, brandInfo);

    status = "completed";
    await setProgress(organizationId, status, currentStep);

    return brandInfo;
  } catch (error) {
    await setProgress(
      organizationId,
      "failed",
      currentStep,
      `Unknown error while performing '${status}' step`
    );

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

async function saveToDatabase(organizationId: string, brandInfo: BrandInfo) {
  "use step";

  await convex.mutation(api.brand.upsert, {
    organizationId,
    companyName: brandInfo.companyName,
    companyDescription: brandInfo.companyDescription,
    toneProfile: brandInfo.toneProfile,
    customTone: brandInfo.customTone ?? undefined,
    audience: brandInfo.audience,
  });
}
