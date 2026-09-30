export interface BrandSettings {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  websiteUrl: string | null;
  companyName: string | null;
  companyDescription: string | null;
  toneProfile: string | null;
  customTone: string | null;
  customInstructions: string | null;
  audience: string | null;
  language: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandSettingsResponse {
  voices: BrandSettings[];
}

export interface BrandSettingsQueryOptions {
  enabled?: boolean;
}

export type ProgressStatus =
  | "idle"
  | "scraping"
  | "extracting"
  | "saving"
  | "completed"
  | "failed";

export interface ProgressData {
  status: ProgressStatus;
  currentStep: number;
  totalSteps: number;
  error?: string;
}

export interface ProgressResponse {
  progress: ProgressData;
}
