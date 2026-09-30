import {
  ANALYSIS_STEPS,
  FULL_URL_REGEX,
  LANGUAGE_FLAGS,
} from "@/constants/brand-identity";
import type {
  BrandFormInitialData,
  BrandIdentityUiAction,
  BrandIdentityUiState,
  StepIconState,
} from "@/types/brand-identity";
import type { BrandSettings, ProgressData } from "@/types/hooks/brand-analysis";

export function getBrandFormInitialData(
  voice: BrandSettings
): BrandFormInitialData {
  return {
    name: voice.name,
    websiteUrl: voice.websiteUrl ? sanitizeBrandUrlInput(voice.websiteUrl) : "",
    companyName: voice.companyName ?? "",
    companyDescription: voice.companyDescription ?? "",
    toneProfile: (voice.toneProfile as ToneProfile) ?? "Professional",
    customTone: voice.customTone ?? "",
    customInstructions: voice.customInstructions ?? "",
    useCustomTone: Boolean(voice.customTone),
    audience: voice.audience ?? "",
    language: getValidLanguage(voice.language),
  };
}

const BRITISH_ENGLISH_LOCALE_REGEX = /^en[-_]GB\b/i;

function isBritishEnglishLocale(locale: string) {
  try {
    const parsedLocale = new Intl.Locale(locale);
    return (
      parsedLocale.language.toLowerCase() === "en" &&
      parsedLocale.region?.toUpperCase() === "GB"
    );
  } catch {
    return BRITISH_ENGLISH_LOCALE_REGEX.test(locale);
  }
}

export function getLanguageFlag(
  language: string,
  userLocales: readonly string[] = []
) {
  if (
    language === "English" &&
    userLocales.some((locale) => isBritishEnglishLocale(locale))
  ) {
    return "🇬🇧";
  }

  return LANGUAGE_FLAGS[language as keyof typeof LANGUAGE_FLAGS] ?? "🏳️";
}

export function getStepperValue(status: string, currentStep: number): string {
  if (status === "idle" || status === "failed") {
    return "";
  }
  if (status === "completed") {
    return "saving";
  }
  const stepIndex = Math.max(0, currentStep - 1);
  return ANALYSIS_STEPS[stepIndex]?.value ?? ANALYSIS_STEPS[0]?.value ?? "";
}

export function getEffectiveBrandAnalysisProgress(
  progress: ProgressData,
  isPending: boolean
): ProgressData {
  return isPending && progress.status === "idle"
    ? { status: "scraping", currentStep: 1, totalSteps: 3 }
    : progress;
}

export function isBrandAnalysisRunning(
  progress: ProgressData,
  isPending: boolean
): boolean {
  return (
    isPending ||
    progress.status === "scraping" ||
    progress.status === "extracting" ||
    progress.status === "saving"
  );
}

export function getModalState(isAnalyzing: boolean, status: string) {
  if (isAnalyzing) {
    return "analyzing";
  }
  if (status === "failed") {
    return "failed";
  }
  return "idle";
}

export const sanitizeBrandUrlInput = (value: string) =>
  value.trim().replace(FULL_URL_REGEX, "");

export const getWebsiteDisplayText = (websiteUrl: string | null) => {
  if (!websiteUrl) {
    return "";
  }

  const normalizedUrl = websiteUrl.startsWith("http")
    ? websiteUrl
    : `https://${websiteUrl}`;

  try {
    return new URL(normalizedUrl).hostname;
  } catch {
    return sanitizeBrandUrlInput(websiteUrl);
  }
};

export function getStepIconState(
  currentStep: number,
  stepNumber: number
): StepIconState {
  if (currentStep < stepNumber) {
    return "pending";
  }
  if (currentStep > stepNumber) {
    return "completed";
  }
  return "active";
}

export function getInitialBrandIdentityUiState(): BrandIdentityUiState {
  return {
    addIdentityOpen: false,
    addReferenceOpen: false,
    addSitemapOpen: false,
    deleteTargetVoiceId: null,
    isSaving: false,
    storedVoiceId: null,
    url: "",
  };
}

export function brandIdentityUiReducer(
  state: BrandIdentityUiState,
  action: BrandIdentityUiAction
): BrandIdentityUiState {
  switch (action.type) {
    case "set-add-identity-open":
      return { ...state, addIdentityOpen: action.open };
    case "set-add-reference-open":
      return { ...state, addReferenceOpen: action.open };
    case "set-add-sitemap-open":
      return { ...state, addSitemapOpen: action.open };
    case "set-delete-target-voice-id":
      return { ...state, deleteTargetVoiceId: action.voiceId };
    case "set-is-saving":
      return state.isSaving === action.isSaving
        ? state
        : { ...state, isSaving: action.isSaving };
    case "set-stored-voice-id":
      return { ...state, storedVoiceId: action.voiceId };
    case "set-url":
      return { ...state, url: action.url };
    default:
      return state;
  }
}
import type { ToneProfile } from "@notra/ai/schemas/tone";
import { getValidLanguage } from "@notra/schemas/dashboard/brand";
