"use client";

import { UiLabelsProvider } from "@notra/ui/components/shared/ui-labels-provider";
import { Toaster } from "@notra/ui/components/ui/sonner";
import { TooltipProvider } from "@notra/ui/components/ui/tooltip";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ThemeProvider } from "next-themes";
import dynamic from "next/dynamic";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { PostHogIdentity } from "@/components/providers/posthog-identity";
import { POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { useUiLabelsTranslations } from "@/lib/i18n/ui-labels";
import { configureZodLocale } from "@/lib/i18n/zod";

const DatabuddyAnalytics = dynamic(() =>
  import("@/components/providers/databuddy-analytics").then(
    (module) => module.DatabuddyAnalytics
  )
);

const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(() =>
        import("@tanstack/react-query-devtools").then(
          (mod) => mod.ReactQueryDevtools
        )
      )
    : null;

function RetryToastLabel() {
  const t = useTranslations("common.actions");
  return t("retry");
}

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
                  label: <RetryToastLabel />,
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

  return queryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createProviderClients);
  configureZodLocale(useLocale());
  const uiLabels = useUiLabelsTranslations();
  const isClient = useIsClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        {isClient && ReactQueryDevtools ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </Suspense>
      <ThemeProvider attribute="class" disableTransitionOnChange enableSystem>
        <UiLabelsProvider labels={uiLabels}>
          <TooltipProvider delay={500} glide={false}>
            <NuqsAdapter>
              {children}
              {POSTHOG_PROJECT_TOKEN ? (
                <Suspense fallback={null}>
                  <PostHogIdentity />
                </Suspense>
              ) : null}
            </NuqsAdapter>
            <Toaster position="bottom-right" />
            <Suspense fallback={null}>
              {isClient ? <DatabuddyAnalytics /> : null}
            </Suspense>
          </TooltipProvider>
        </UiLabelsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
