"use client";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConvexClientProvider } from "./providers/convex-client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <ThemeProvider attribute="class" disableTransitionOnChange enableSystem>
        <TooltipProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
