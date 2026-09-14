"use client";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";

export function OnboardingRuntimeProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DatabaseProvider>
      <AutumnOrgProvider>{children}</AutumnOrgProvider>
    </DatabaseProvider>
  );
}
