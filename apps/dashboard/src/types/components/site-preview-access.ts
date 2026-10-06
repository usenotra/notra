import type { SitePreviewAccessMode } from "@/types/site-preview-access";

export interface SitePreviewAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SitePreviewAccessFormProps {
  onDone: () => void;
}

export interface SitePreviewBuildToggleProps {
  id: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export interface SitePreviewAccessModesProps {
  idPrefix: string;
  mode: SitePreviewAccessMode;
  onModeChange: (mode: SitePreviewAccessMode) => void;
}

export interface SitePreviewPasswordFieldProps {
  idPrefix: string;
  passwordSetAt: Date | string | null;
  editing: boolean;
  onEdit: () => void;
  value: string;
  onChange: (value: string) => void;
  tooShort: boolean;
  showPassword: boolean;
  onToggleShowPassword: () => void;
}
