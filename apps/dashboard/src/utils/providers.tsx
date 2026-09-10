"use client";

import { Databuddy } from "@databuddy/sdk/react";
import { Toaster } from "@notra/ui/components/ui/sonner";
import { TooltipProvider } from "@notra/ui/components/ui/tooltip";
import { DbClient, DbProvider } from "@tanstack/react-db";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";
import { ThemeProvider } from "next-themes";
import dynamic from "next/dynamic";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { PostHogIdentity } from "@/components/providers/posthog-identity";
import { POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";
import { useMcpConnectionToast } from "@/lib/hooks/use-mcp-connection-toast";
import {
  DATABUDDY_DASHBOARD_MASK_PATTERNS,
  normalizeDatabuddyEventPath,
} from "@/utils/databuddy";

const databuddyClientID =
  process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID;

const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then(
            (mod) => mod.ReactQueryDevtools
          ),
        { ssr: false }
      )
    : null;

function createProviderClients() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (_error, query) => {
        const message = query.meta?.errorMessage;
        if (typeof message === "string") {
          const showRetryAction = query.meta?.showRetryAction === true;

          toast.error(message, {
            id: showRetryAction ? query.queryHash : undefined,
            duration: showRetryAction ? Number.POSITIVE_INFINITY : undefined,
            action: showRetryAction
              ? {
                  label: "Retry",
                  onClick: () => {
                    query.fetch().catch(() => undefined);
                  },
                }
              : undefined,
          });
        }
      },
      onSuccess: (_data, query) => {
        if (query.meta?.showRetryAction === true) {
          toast.dismiss(query.queryHash);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60, // 1 hour
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: 1,
        retryDelay: (attemptIndex: number) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
      },
      mutations: {
        retry: false,
      },
    },
  });

  const dbClient = new DbClient({ queryClient });
  return { queryClient, dbClient };
}

function DatabuddyAnalytics() {
  if (!databuddyClientID) {
    return null;
  }

  return (
    <Databuddy
      clientId={databuddyClientID}
      filter={normalizeDatabuddyEventPath}
      maskPatterns={DATABUDDY_DASHBOARD_MASK_PATTERNS}
      trackAttributes={true}
      trackErrors={true}
      trackHashChanges={true}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [{ queryClient, dbClient }] = useState(createProviderClients);
  useMcpConnectionToast();

  return (
    <QueryClientProvider client={queryClient}>
      <DbProvider client={dbClient}>
        {ReactQueryDevtools ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
        <ThemeProvider attribute="class" disableTransitionOnChange enableSystem>
          <TooltipProvider delay={500}>
            <AutumnOrgProvider>
              <NuqsAdapter>
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
                <DatabuddyAnalytics />
              </NuqsAdapter>
              <Toaster position="top-center" />
            </AutumnOrgProvider>
          </TooltipProvider>
        </ThemeProvider>
      </DbProvider>
    </QueryClientProvider>
  );
}
