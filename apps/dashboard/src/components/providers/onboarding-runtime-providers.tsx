"use client";

import { Suspense } from "react";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";
import { PostHogIdentity } from "@/components/providers/posthog-identity";
import { POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";

export function OnboardingRuntimeProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DatabaseProvider>
      <AutumnOrgProvider>
        {children}
        {POSTHOG_PROJECT_TOKEN ? (
          <Suspense fallback={null}>
            <PostHogIdentity />
          </Suspense>
        ) : null}
      </AutumnOrgProvider>
    </DatabaseProvider>
  );
}
