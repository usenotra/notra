import type { SitePreviewAccessMode } from "@/types/site-preview-access";

export interface SitePreviewAccessFormProps {
  onDone: () => void;
}

export interface SitePreviewAccessModesProps {
  idPrefix: string;
  mode: SitePreviewAccessMode | "off";
  onModeChange: (mode: SitePreviewAccessMode | "off") => void;
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
