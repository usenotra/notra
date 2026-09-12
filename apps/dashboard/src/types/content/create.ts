import type {
  ContentDataPointSettings,
  OnDemandContentType,
} from "@notra/schemas/dashboard/content";
import type { LookbackWindow } from "@notra/schemas/dashboard/integrations";

import type {
  PreviewResponse,
  RepositoryPreview,
} from "@/types/content/preview";

export type WizardStep = "formats" | "activity" | "identities";

export interface WizardFormValues {
  formats: OnDemandContentType[];
  lookbackWindow: LookbackWindow;
  dataPoints: ContentDataPointSettings;
  repositoryIds: string[];
  brandVoiceIds: string[];
}

export interface IntegrationOption {
  value: string;
  label: string;
  ownerRepo: string | null;
  type: "github" | "linear";
}

export interface FormatsStepProps {
  selected: OnDemandContentType[];
  onToggle: (format: OnDemandContentType) => void;
  lookbackWindow: LookbackWindow;
  onLookbackChange: (window: LookbackWindow) => void;
  dataPoints: ContentDataPointSettings;
  onDataPointChange: (
    key: keyof ContentDataPointSettings,
    value: boolean
  ) => void;
  timezone: string;
}

export interface ActivityStepProps {
  organizationId: string;
  integrationOptions: IntegrationOption[];
  selectedIntegrationIds: string[];
  onToggleIntegration: (value: string) => void;
  onToggleAllIntegrations: () => void;
  isLoadingIntegrations: boolean;
  onConnect: () => void;
  repositories: RepositoryPreview[] | undefined;
  preview: PreviewResponse | undefined;
  isLoadingPreview: boolean;
  isPreviewError: boolean;
  onRetryPreview: () => void;
  dataPoints: ContentDataPointSettings;
  selectedCommitKeys: Set<string>;
  selectedPrKeys: Set<string>;
  selectedReleaseKeys: Set<string>;
  selectedLinearKeys: Set<string>;
  onToggleCommit: (key: string) => void;
  onTogglePr: (key: string) => void;
  onToggleRelease: (key: string) => void;
  onToggleLinear: (key: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}

export interface BrandIdentitiesStepProps {
  voices: Array<{ id: string; name: string; isDefault: boolean }>;
  selected: string[];
  onToggle: (id: string) => void;
  isLoading: boolean;
  organizationId: string;
}

export interface StepProgressProps {
  activeIndex: number;
  onStepSelect: (index: number) => void;
}

export interface SelectionState {
  commits: Set<string>;
  prs: Set<string>;
  releases: Set<string>;
  linear: Set<string>;
}
