import type {
  SidebarUpgradeCopy,
  SidebarUpgradeCopyInput,
  SidebarUpgradeTranslator,
} from "@/types/dashboard/sidebar-upgrade";
import type { CommonTranslator } from "@/types/i18n";

export function canShowSidebarUpgrade(
  completed?: boolean | null,
  dismissed?: boolean | null
) {
  return (
    process.env.NEXT_PUBLIC_SHOW_UPGRADE_BUTTON === "true" &&
    Boolean(completed || dismissed)
  );
}

export function sidebarUpgradeCopy(
  input: SidebarUpgradeCopyInput,
  t: SidebarUpgradeTranslator,
  tCommon: CommonTranslator
): SidebarUpgradeCopy {
  if (input.hasNoPlan) {
    return {
      buttonLabel: t("upgradeNow"),
      description: t("freeDescription"),
      heading: t("freeHeading"),
    };
  }
  const upgradeLabel = t("upgradeToPlan", { plan: input.planName ?? "" });
  return {
    buttonLabel: input.isLoading ? tCommon("states.loading") : upgradeLabel,
    description: t("paidDescription"),
    heading: upgradeLabel,
  };
}
