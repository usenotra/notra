import { describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

if (process.env.NOTRA_ORGANIZATION_PROVIDER_TEST !== "1") {
  test("organization provider with isolated module mocks", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_ORGANIZATION_PROVIDER_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  mock.module("next/navigation", () => ({
    notFound: mock(),
    redirect: mock(),
    unstable_rethrow: mock(),
    usePathname: () => "/acme",
    useRouter: () => ({ push: mock(), replace: mock() }),
  }));
  mock.module("@/lib/auth/client", () => ({
    authClient: {
      organization: {
        getFullOrganization: mock(async () => ({ data: null })),
        getSummary: mock(async () => ({ data: null })),
        list: mock(async () => ({ data: [] })),
        setActive: mock(async () => ({ error: null })),
      },
      useListOrganizations: () => ({ data: [] }),
    },
  }));
  mock.module("@/utils/cookies", () => ({
    setLastVisitedOrganization: mock(async () => undefined),
  }));

  const { OrganizationsProvider, useOrganizationsContext } =
    await import("../src/components/providers/organization-provider");

  const activeOrganization = {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    id: "org-acme",
    logo: null,
    metadata: null,
    name: "Acme",
    slug: "acme",
  };

  const OrgListStatus = () => {
    const { isLoading, organizations } = useOrganizationsContext();
    return (
      <div>
        {isLoading ? "loading" : "ready"}:
        {organizations.map((org) => org.slug).join(",")}
      </div>
    );
  };

  describe("OrganizationsProvider list completeness", () => {
    test("treats the active-organization placeholder as loading", () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <OrganizationsProvider
            initialActiveOrganization={activeOrganization as never}
          >
            <OrgListStatus />
          </OrganizationsProvider>
        </QueryClientProvider>
      );

      expect(html).toContain("loading");
      expect(html).not.toContain("ready:");
    });
  });
}
