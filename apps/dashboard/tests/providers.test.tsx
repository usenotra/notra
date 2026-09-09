import { expect, mock, test } from "bun:test";

import { useDbClient } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/hooks/use-mcp-connection-toast", () => ({
  useMcpConnectionToast: () => undefined,
}));
mock.module("@/components/providers/autumn-org-provider", () => ({
  AutumnOrgProvider: ({ children }: PropsWithChildren) => children,
}));
mock.module("@/components/providers/posthog-identity", () => ({
  PostHogIdentity: () => null,
}));
mock.module("nuqs/adapters/next/app", () => ({
  NuqsAdapter: ({ children }: PropsWithChildren) => children,
}));
mock.module("next/dynamic", () => ({ default: () => () => null }));

const { Providers } = await import("../src/utils/providers");

function OnboardingConsumer() {
  const dbClient = useDbClient();
  const queryClient = useQueryClient();
  expect(dbClient).toBeDefined();
  expect(queryClient).toBeDefined();
  return <div>Onboarding collections available</div>;
}

test("provides react-db outside the dashboard layout", () => {
  expect(
    renderToStaticMarkup(
      <Providers>
        <OnboardingConsumer />
      </Providers>
    )
  ).toContain("Onboarding collections available");
});
