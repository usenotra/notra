"use client";

import { RealtimeProvider } from "@upstash/realtime/client";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";
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
      </AutumnOrgProvider>
    </DatabaseProvider>
  );
}
