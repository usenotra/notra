import type { IconSvgElement } from "@hugeicons/react";
import type { useTranslations } from "next-intl";

import type { SettingsSectionId } from "@/types/settings/modal";

export type CommandSection =
  | "Navigation"
  | "GEO"
  | "Workspace"
  | "Automation"
  | "Manage"
  | "Settings";

export type CommandRouteId =
  | "home"
  | "chat"
  | "analytics"
  | "geo"
  | "geo-traffic"
  | "geo-prompts"
  | "geo-personas"
  | "geo-gaps"
  | "geo-shelf-space"
  | "geo-competitors"
  | "geo-write"
  | "geo-settings-brand"
  | "geo-settings-languages"
  | "geo-settings-models"
  | "content"
  | "brand-company-info"
  | "brand-references"
  | "automation-schedules"
  | "automation-events"
  | "api-keys"
  | "integrations"
  | "github-integration"
  | "logs"
  | "settings-account"
  | "settings-general"
  | "settings-members"
  | "settings-notifications"
  | "settings-billing"
  | "settings-usage"
  | "settings-credits";

export interface CommandRoute {
  id: CommandRouteId;
  label: string;
  keywords: string[];
  icon: IconSvgElement;
  section: CommandSection;
  path: (slug: string) => string;
  requiresAiCredits?: boolean;
  settingsSection?: SettingsSectionId;
}

export type AiResult =
  | { action: "navigate"; path: string; reason: string }
  | { action: "chat"; path: null; reason: string };

export interface EntityHit {
  key: string;
  label: string;
  sublabel?: string;
  icon: IconSvgElement;
  path: string;
  keywords: string[];
}

export interface CommandPaletteSearchData {
  posts: readonly {
    id: string;
    title: string;
    status: string;
    slug: string | null;
  }[];
  voices: readonly {
    id: string;
    name: string;
    companyName: string | null;
    websiteUrl: string | null;
  }[];
  references: readonly {
    id: string;
    type: string;
    content: string;
    note: string | null;
  }[];
  githubIntegrations: readonly {
    id: string;
    displayName: string;
    owner: string | null;
    repo: string | null;
  }[];
  linearIntegrations: readonly {
    id: string;
    displayName: string;
    linearOrganizationName: string | null;
    linearTeamName: string | null;
  }[];
  socialAccounts: readonly {
    id: string;
    displayName: string;
    provider: string;
    username: string;
  }[];
}

export type EntityHitSection =
  | "posts"
  | "brandVoices"
  | "references"
  | "integrations";

export type CommandPaletteTranslator = ReturnType<
  typeof useTranslations<"commandPalette">
>;

export type CommandPaletteNavigatingLabelKey = "opening" | "openingChat";

export type EntityHitsBySection = Record<EntityHitSection, EntityHit[]>;

export interface CommandPaletteDialogProps {
  abortRef: { current: AbortController | null };
  aiState:
    | { status: "idle" }
    | { status: "loading" }
    | { status: "navigating"; labelKey: CommandPaletteNavigatingLabelKey }
    | { status: "error" };
  entityHitsBySection: EntityHitsBySection;
  handleOpenChange: (open: boolean) => void;
  hasAiCredits: boolean;
  isApplePlatform: boolean;
  navigate: (path: string) => void;
  open: boolean;
  openChatWithQuery: (text: string) => void;
  openFeedback: () => void;
  openSettings: (section?: SettingsSectionId) => void;
  query: string;
  runAiSearch: () => Promise<void>;
  setAiState: (
    state:
      | { status: "idle" }
      | { status: "loading" }
      | { status: "navigating"; labelKey: CommandPaletteNavigatingLabelKey }
      | { status: "error" }
  ) => void;
  setQuery: (value: string) => void;
  slug: string;
}

export interface CommandPalettePanelProps {
  aiModifierLabel: string;
  aiState: CommandPaletteDialogProps["aiState"];
  entityHitsBySection: EntityHitsBySection;
  handleOpenChange: (open: boolean) => void;
  hasAiCredits: boolean;
  isLoading: boolean;
  isNavigatingAi: boolean;
  navigate: (path: string) => void;
  openChatWithQuery: (text: string) => void;
  openFeedback: () => void;
  openSettings: (section?: SettingsSectionId) => void;
  query: string;
  runAiSearch: () => Promise<void>;
  slug: string;
  trimmedQuery: string;
}
