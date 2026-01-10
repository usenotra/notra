"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth/auth-client";

const convexPublicURL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexPublicURL) {
  throw new Error("Convex Public URL is missing");
}

const convex = new ConvexReactClient(convexPublicURL);

interface ConvexClientProviderProps {
  children: ReactNode;
  initialToken?: string | null;
}

export function ConvexClientProvider({
  children,
  initialToken,
}: ConvexClientProviderProps) {
  return (
    <ConvexBetterAuthProvider
      authClient={authClient}
      client={convex}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
