"use client";

import { Databuddy } from "@databuddy/sdk/react";
import { Toaster } from "@notra/ui/components/ui/sonner";
import { TooltipProvider } from "@notra/ui/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AutumnProvider } from "autumn-js/react";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const databuddyClientID = process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID;

const queryClient = new QueryClient({
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <ThemeProvider attribute="class" disableTransitionOnChange enableSystem>
        <TooltipProvider>
          <AutumnProvider>
            <NuqsAdapter>
              {children}
              {databuddyClientID && (
                <Databuddy
                  clientId={process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID}
                />
              )}
            </NuqsAdapter>
            <Toaster position="top-center" />
          </AutumnProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
