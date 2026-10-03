import type { useTranslations } from "next-intl";

export type SidebarUpgradeTranslator = ReturnType<
  typeof useTranslations<"nav.upgrade">
>;

export interface SidebarUpgradeCopyInput {
  hasNoPlan: boolean;
  isLoading: boolean;
  planName: string | undefined;
}

export interface SidebarUpgradeCopy {
  buttonLabel: string;
  description: string;
  heading: string;
}
