"use client";

import { RealtimeProvider } from "@upstash/realtime/client";
import { Suspense } from "react";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";
import { PostHogIdentity } from "@/components/providers/posthog-identity";
import { POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";
import { useMcpConnectionToast } from "@/lib/hooks/use-mcp-connection-toast";

export function DashboardRuntimeProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  useMcpConnectionToast();

  return (
    <DatabaseProvider>
      <AutumnOrgProvider>
        <RealtimeProvider
          api={{ url: "/api/realtime", withCredentials: true }}
          maxReconnectAttempts={5}
        >
          {children}
        </RealtimeProvider>
        {POSTHOG_PROJECT_TOKEN ? (
          <Suspense fallback={null}>
            <PostHogIdentity />
          </Suspense>
        ) : null}
      </AutumnOrgProvider>
    </DatabaseProvider>
  );
}
