import type { LocalePreference } from "@/types/i18n";

export interface UpdateUserInput {
  name?: string;
  image?: string | null;
  hidePersonalData?: boolean;
  showAgentStats?: boolean;
  locale?: LocalePreference;
}

export interface UnlinkAccountInput {
  providerId: string;
}

export interface SignOutActionOptions {
  returnTo?: string;
}
