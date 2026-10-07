"use client";

import { useDeferredMount } from "@/lib/hooks/use-deferred-mount";
import dynamic from "@/utils/lazy-component";

const SidebarOnboarding = dynamic(
  () =>
    import("@/components/dashboard/sidebar-onboarding").then(
      (module) => module.SidebarOnboarding
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

  return <SidebarOnboarding />;
}

export function DeferredSidebarUpgrade() {
  const ready = useDeferredMount();

  return ready ? <SidebarUpgrade /> : null;
}
