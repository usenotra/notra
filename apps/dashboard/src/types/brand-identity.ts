import type { SupportedLanguage } from "@notra/ai/constants/languages";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import type { AffectedTrigger } from "@notra/schemas/dashboard/integrations";
import type { Dispatch } from "react";

import type { useBrandForm } from "@/lib/hooks/use-brand-form";
import type { BrandSettings, ProgressData } from "@/types/hooks/brand-analysis";
import type {
  BrandGuidelineAsset,
  BrandGuidelineAssetKind,
  BrandGuidelineAssetVariant,
  BrandGuidelineColor,
  BrandGuidelineColorRole,
  BrandGuidelineFont,
  BrandGuidelineScreenshot,
  BrandGuidelineToken,
} from "@/types/hooks/brand-guidelines";

export type BrandTab = "identity" | "references" | "sitemap" | "guidelines";

export interface BrandIdentityUiState {
  addIdentityOpen: boolean;
  addReferenceOpen: boolean;
  addSitemapOpen: boolean;
  deleteTargetVoiceId: string | null;
  isSaving: boolean;
  lastSavedAtMs: number | null;
  relativeTimeNow: number;
  storedVoiceId: string | null;
  url: string;
}

export type BrandIdentityUiAction =
  | { type: "set-add-identity-open"; open: boolean }
  | { type: "set-add-reference-open"; open: boolean }
  | { type: "set-add-sitemap-open"; open: boolean }
  | { type: "set-delete-target-voice-id"; voiceId: string | null }
  | { type: "set-is-saving"; isSaving: boolean }
  | { type: "set-last-saved-at-ms"; savedAtMs: number | null }
  | { type: "set-relative-time-now"; now: number }
  | { type: "set-stored-voice-id"; voiceId: string | null }
  | { type: "set-url"; url: string };

export interface GuidelinesPanelProps {
  organizationId: string;
  voiceId: string;
}

export interface GuidelinesSectionContext {
  organizationId: string;
  voiceId: string;
}

export interface GuidelinesAssetsSectionProps extends GuidelinesSectionContext {
  assets: BrandGuidelineAsset[];
}

export interface GuidelinesColorsSectionProps extends GuidelinesSectionContext {
  colors: BrandGuidelineColor[];
}

export interface GuidelinesTypographySectionProps extends GuidelinesSectionContext {
  fonts: BrandGuidelineFont[];
}

export interface GuidelinesTokensSectionProps extends GuidelinesSectionContext {
  tokens: BrandGuidelineToken[];
}

export interface GuidelinesScreenshotsSectionProps extends GuidelinesSectionContext {
  screenshots: BrandGuidelineScreenshot[];
}

export interface GuidelinesResourceActionsProps {
  url: string;
  label: string;
  onEdit?: () => void;
}

interface GuidelineEditDialogBase extends GuidelinesSectionContext {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface GuidelinesColorEditDialogProps extends GuidelineEditDialogBase {
  color: BrandGuidelineColor | null;
  presetRole?: BrandGuidelineColorRole;
}

export interface GuidelinesFontEditDialogProps extends GuidelineEditDialogBase {
  font: BrandGuidelineFont;
}

export interface GuidelinesTokenEditDialogProps extends GuidelineEditDialogBase {
  token: BrandGuidelineToken;
}

export interface GuidelinesAssetEditDialogProps extends GuidelineEditDialogBase {
  asset: BrandGuidelineAsset | null;
  presetKind?: BrandGuidelineAssetKind;
  presetVariant?: BrandGuidelineAssetVariant;
}

export interface GuidelinesScreenshotEditDialogProps extends GuidelineEditDialogBase {
  screenshot: BrandGuidelineScreenshot;
}

export interface BrandIdentityHeaderProps {
  activeTab: BrandTab;
  onAddIdentity: () => void;
  onAddReference: () => void;
  onAddSitemap: () => void;
  onRefreshGuidelines: () => void;
  isRefreshingGuidelines: boolean;
}

export interface BrandIdentityTabsProps {
  activeTab: BrandTab;
  addReferenceOpen: boolean;
  addSitemapOpen: boolean;
  initialData: BrandFormInitialData;
  onActiveTabChange: (tab: BrandTab) => void;
  onAddReferenceOpenChange: (open: boolean) => void;
  onAddSitemapOpenChange: (open: boolean) => void;
  onSavedAtChange: (savedAt: Date) => void;
  onSavingChange: (isSaving: boolean) => void;
  organizationId: string;
  referenceCount: number;
  saveStatusText: string;
  sitemapCount: number;
  voiceId: string;
  voiceWebsiteUrl: string | null;
}

export interface BrandIdentityWorkspaceProps {
  activeTab: BrandTab;
  affectedEvents: AffectedTrigger[];
  affectedSchedules: AffectedTrigger[];
  analyzePending: boolean;
  deleteVoicePending: boolean;
  dispatchUi: Dispatch<BrandIdentityUiAction>;
  effectiveProgress: ProgressData;
  guidelinesRefreshPending: boolean;
  handleAddIdentityOpenChange: (open: boolean) => void;
  handleDeleteVoice: () => void;
  handleReanalyze: (voiceUrl: string) => void;
  handleSelectVoice: (voiceId: string) => void;
  handleSetDefault: () => void;
  isAddIdentityOpen: boolean;
  isAnalyzing: boolean;
  isLoadingAffected: boolean;
  organizationId: string;
  progressError?: string;
  referenceCount: number;
  selectedVoice: BrandSettings;
  setDefaultPending: boolean;
  setActiveTab: (tab: BrandTab) => void;
  sitemapCount: number;
  startPolling: () => void;
  uiState: BrandIdentityUiState;
  voices: BrandSettings[];
  onRefreshGuidelines: () => void;
}

export interface PageClientProps {
  organizationSlug: string;
}

export interface ModalContentProps {
  isPendingSettings: boolean;
  isAnalyzing: boolean;
  progress: { status: string; currentStep: number };
  url: string;
  setUrl: (url: string) => void;
  handleAnalyze: () => void;
  isPending: boolean;
  inlineError?: string;
}

export interface VoiceSelectorProps {
  voices: BrandSettings[];
  activeVoiceId: string;
  onSelect: (id: string) => void;
  organizationId: string;
  onReanalyze: (url: string) => void;
  isReanalyzing: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  onSetDefault: () => void;
  isSettingDefault: boolean;
  affectedSchedules: AffectedTrigger[];
  affectedEvents: AffectedTrigger[];
  isLoadingAffected: boolean;
  isDeleteDialogOpen: boolean;
  onRequestDelete: (voiceId: string) => void;
  onDeleteDialogChange: (open: boolean) => void;
}

export interface AddIdentityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated: (voice: BrandSettings) => void;
  startPolling: () => void;
}

export interface BrandFormInitialData {
  name: string;
  websiteUrl: string;
  companyName: string;
  companyDescription: string;
  toneProfile: ToneProfile;
  customTone: string;
  customInstructions: string;
  useCustomTone: boolean;
  audience: string;
  language: SupportedLanguage;
}

export interface BrandFormProps {
  organizationId: string;
  voiceId: string;
  initialData: BrandFormInitialData;
  onSavingChange?: (isSaving: boolean) => void;
  onSavedAtChange?: (savedAt: Date) => void;
}

export type BrandFormApi = ReturnType<typeof useBrandForm>;

export interface CompanyProfileFieldsProps {
  form: BrandFormApi;
}

export interface ToneLanguageFieldsProps {
  form: BrandFormApi;
  userLocales: readonly string[];
}

export interface AudienceFieldProps {
  form: BrandFormApi;
}

export type StepIconState = "pending" | "active" | "completed";
