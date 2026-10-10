import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import type { SiteSettingsForm, SiteSettingsToggleField } from "@/types/sites";

export interface SiteSettingsGroupProps {
  icon: IconSvgElement;
  title: ReactNode;
  children: ReactNode;
}

export interface SiteSettingsListProps {
  children: ReactNode;
}

export interface SiteSettingsItemBaseProps {
  icon: IconSvgElement;
  title: ReactNode;
  description?: ReactNode;
}

export interface SiteSettingsItemProps extends SiteSettingsItemBaseProps {
  value?: ReactNode;
  /** Editor shown when the row is expanded. Without it the row is read-only. */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface SiteSettingsSwitchItemProps extends SiteSettingsItemBaseProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export interface SiteSettingsToggleProps extends SiteSettingsItemBaseProps {
  field: SiteSettingsToggleField;
}

export interface SiteSettingsValueProps {
  children: ReactNode;
  mono?: boolean;
}

export interface SiteSettingsEditorProps {
  onDone: () => void;
  isValid?: (form: SiteSettingsForm) => boolean;
  children: (
    form: SiteSettingsForm,
    update: <K extends keyof SiteSettingsForm>(
      key: K,
      value: SiteSettingsForm[K]
    ) => void
  ) => ReactNode;
}

export interface SiteSettingsEditorFooterProps {
  canSave: boolean;
  isSaving: boolean;
  onCancel: () => void;
}

export interface SiteSettingsTextFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export interface SiteRootDirectoryFieldProps extends SiteSettingsTextFieldProps {
  branch: string;
}

export type SiteBranchFieldProps = SiteSettingsTextFieldProps;

export interface SiteSectionFieldProps {
  title: string;
  enabled: boolean;
  path: string;
  onEnabledChange: (enabled: boolean) => void;
  onPathChange: (path: string) => void;
}

export interface SiteSettingsIconTileProps {
  icon: IconSvgElement;
}

export interface SiteSettingsItemTextProps {
  title: ReactNode;
  description?: ReactNode;
}

export interface SiteSettingsHintProps {
  children: ReactNode;
}
