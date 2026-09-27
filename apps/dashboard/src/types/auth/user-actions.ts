import type { DashboardLocale } from "@/types/i18n";

export interface UpdateUserInput {
  name?: string;
  image?: string | null;
  hidePersonalData?: boolean;
  showAgentStats?: boolean;
  locale?: DashboardLocale;
}

export interface UnlinkAccountInput {
  providerId: string;
}

export interface SignOutActionOptions {
  returnTo?: string;
}
