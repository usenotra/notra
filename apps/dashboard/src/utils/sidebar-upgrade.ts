import type {
  SidebarUpgradeCopy,
  SidebarUpgradeCopyInput,
} from "@/types/dashboard/sidebar-upgrade";

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
  input: SidebarUpgradeCopyInput
): SidebarUpgradeCopy {
  if (input.hasNoPlan) {
    return {
      buttonLabel: "Upgrade now",
      description:
        "Feedback is free. Upgrade for AI content and visibility tracking.",
      heading: "Get more from Notra",
    };
  }
  const upgradeLabel = `Upgrade to ${input.planName}`;
  return {
    buttonLabel: input.isLoading ? "Loading..." : upgradeLabel,
    description: "Get more AI answers, projects, and higher usage limits.",
    heading: upgradeLabel,
  };
}
