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

function upgradeButtonLabel(
  { hasNoPlan, isLoading, showTrial }: SidebarUpgradeCopyInput,
  upgradeLabel: string
): string {
  if (isLoading) {
    return "Loading...";
  }
  if (showTrial) {
    return "Start free trial";
  }
  return hasNoPlan ? "Get started" : upgradeLabel;
}

function upgradeDescription({
  hasNoPlan,
  showTrial,
}: SidebarUpgradeCopyInput): string {
  if (!hasNoPlan) {
    return "Get more AI answers, projects, and higher usage limits.";
  }
  return showTrial
    ? "Start your free trial and unlock AI-powered workflows."
    : "Pick a plan to unlock AI-powered workflows.";
}

export function sidebarUpgradeCopy(
  input: SidebarUpgradeCopyInput
): SidebarUpgradeCopy {
  const upgradeLabel = `Upgrade to ${input.planName}`;
  return {
    buttonLabel: upgradeButtonLabel(input, upgradeLabel),
    description: upgradeDescription(input),
    heading: input.hasNoPlan ? "Get Started" : upgradeLabel,
  };
}
