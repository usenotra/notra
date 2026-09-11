import type { IconSvgElement } from "@hugeicons/react";
import type {
  API_KEY_ACCESS_MODE_VALUES,
  API_KEY_EXPIRATION_VALUES,
  API_KEY_GRANULAR_PERMISSIONS,
} from "@notra/schemas/constants/dashboard/api-keys";
import type { PermissionTone } from "@notra/ui/components/ui/permission-selector";

import type {
  API_KEY_PERMISSIONS,
  API_KEY_PRESET_IDS,
} from "@/constants/api-keys";

export type ApiKeyPermission = (typeof API_KEY_PERMISSIONS)[number];
export type ApiKeyGranularScope = (typeof API_KEY_GRANULAR_PERMISSIONS)[number];
export type ApiKeyPresetId = (typeof API_KEY_PRESET_IDS)[number];
export type ApiKeyExpiration = (typeof API_KEY_EXPIRATION_VALUES)[number];
export type ApiKeyAccessMode = (typeof API_KEY_ACCESS_MODE_VALUES)[number];

export interface ApiKeyPreset {
  id: ApiKeyPresetId;
  icon: IconSvgElement;
  title: string;
  description: string;
  docsHref: string;
  defaultName: string;
  accessMode: ApiKeyAccessMode;
  scopes: ApiKeyGranularScope[];
  expiration: ApiKeyExpiration;
}

export interface ApiKeyScopeLevel {
  value: string;
  label: string;
  tone: PermissionTone;
  scopes: ApiKeyGranularScope[];
}

export interface ApiKeyScopeGroup {
  id: string;
  label: string;
  description: string;
  readScope: ApiKeyGranularScope;
  writeScope: ApiKeyGranularScope;
  levels: ApiKeyScopeLevel[];
}

export interface TrackingTokenCardProps {
  organizationId: string;
}

export interface ApiKeyRevealFieldProps {
  value: string;
  className?: string;
}

export interface ApiKeyPermissionSelectorProps {
  accessMode: ApiKeyAccessMode;
  value: string[];
  onAccessModeChange: (
    accessMode: ApiKeyAccessMode,
    scopes: ApiKeyGranularScope[]
  ) => void;
  onValueChange: (scopes: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export interface ApiKeyFormValues {
  keyId: string;
  name: string;
  accessMode: ApiKeyAccessMode;
  scopes: string[];
  expiration: ApiKeyExpiration;
}

export type ApiKeyCreateConfig = Omit<ApiKeyFormValues, "keyId">;
