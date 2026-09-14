"use client";

import dynamic from "next/dynamic";

import { useDeferredMount } from "@/lib/hooks/use-deferred-mount";

const SidebarOnboarding = dynamic(
  () =>
    import("@/components/dashboard/sidebar-onboarding").then(
      (module) => module.SidebarOnboarding
    ),
  { ssr: false }
);

const SidebarTrialExpired = dynamic(
  () =>
    import("@/components/dashboard/sidebar-trial-expired").then(
      (module) => module.SidebarTrialExpired
    ),
  { ssr: false }
);

const SidebarUpgrade = dynamic(
  () =>
    import("@/components/dashboard/sidebar-upgrade").then(
      (module) => module.SidebarUpgrade
    ),
  { ssr: false }
);

export function DeferredSidebarStatus() {
  const ready = useDeferredMount();

  if (!ready) {
    return null;
  }

  return (
    <>
      <SidebarTrialExpired />
      <SidebarOnboarding />
      <SidebarUpgrade />
    </>
  );
}
