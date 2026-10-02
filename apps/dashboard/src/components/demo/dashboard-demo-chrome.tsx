"use client";

import { DemoBanner } from "@/components/demo/demo-banner";
import { DemoThemeSync } from "@/components/demo/demo-theme-sync";
import { DemoTimeZoneSync } from "@/components/demo/demo-time-zone-sync";
import type { DashboardDemoChromeProps } from "@/types/components/dashboard-shell";

export function DashboardDemoChrome({ showBanner }: DashboardDemoChromeProps) {
  return (
    <>
      {showBanner ? <DemoBanner /> : null}
      <DemoThemeSync />
      <DemoTimeZoneSync />
    </>
  );
}
