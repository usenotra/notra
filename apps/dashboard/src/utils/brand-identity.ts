import {
  ANALYSIS_STEPS,
  FULL_URL_REGEX,
  LANGUAGE_FLAGS,
} from "@/constants/brand-identity";
import type {
  BrandIdentityUiAction,
  BrandIdentityUiState,
  StepIconState,
} from "@/types/brand-identity";
import type { ProgressData } from "@/types/hooks/brand-analysis";

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

export function getModalTitle(
  isPendingSettings: boolean,
  isAnalyzing: boolean,
  status: string
): string {
  if (isPendingSettings) {
    return "Loading...";
  }
  if (isAnalyzing) {
    return "Analyzing Website";
  }
  if (status === "failed") {
    return "Analysis Failed";
  }
  return "Add Your Brand";
}

export function getModalDescription(
  isPendingSettings: boolean,
  isAnalyzing: boolean,
  status: string,
  error?: string
): string {
  if (isPendingSettings) {
    return "Checking your brand settings";
  }
  if (isAnalyzing) {
    return "Please wait while we extract your brand information";
  }
  if (status === "failed") {
    return error ?? "Something went wrong";
  }
  return "Enter your website URL to automatically extract your brand identity";
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
