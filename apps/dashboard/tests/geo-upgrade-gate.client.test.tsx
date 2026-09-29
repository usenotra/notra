import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Window } from "happy-dom";

if (process.env.NOTRA_GEO_UPGRADE_CLIENT_TEST !== "1") {
  test("GEO upgrade dismissal in a browser", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_GEO_UPGRADE_CLIENT_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  const browser = new Window({ url: "http://localhost/fixture/geo/gaps" });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: browser },
    document: { configurable: true, value: browser.document },
    navigator: { configurable: true, value: browser.navigator },
    HTMLElement: { configurable: true, value: browser.HTMLElement },
    Node: { configurable: true, value: browser.Node },
  });
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  let organization = { id: "org-fixture", slug: "fixture" };
  const push = mock();
  mock.module("next/navigation", () => ({
    usePathname: () => `/${organization.slug}/geo/gaps`,
    useRouter: () => ({ push }),
  }));
  mock.module("@/components/providers/organization-provider", () => ({
    useOrganizationsContext: () => ({
      activeOrganization: organization,
      getOrganization: (slug: string) =>
        organization.slug === slug ? organization : undefined,
    }),
  }));
  mock.module("@/lib/hooks/use-plan", () => ({
    useHasGeoFeature: () => ({ isLocked: true, isLoading: false }),
  }));
  mock.module("@/components/billing/geo-upgrade-dialog", () => ({
    GeoUpgradeDialog: ({
      open,
      onOpenChange,
      onOpenChangeComplete,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onOpenChangeComplete: (open: boolean) => void;
    }) =>
      open ? (
        <button onClick={() => onOpenChange(false)} type="button">
          Close upgrade
        </button>
      ) : (
        <button onClick={() => onOpenChangeComplete(false)} type="button">
          Finish close
        </button>
      ),
  }));
  mock.module("@/components/empty-state-preview", () => ({
    EmptyStateAnalyticsPreview: () => null,
  }));
  mock.module("@/lib/analytics/posthog-client", () => ({
    trackEvent: mock(),
  }));
  mock.module("@/lib/hooks/use-sidebar-mode", () => ({
    pickSidebarMode: mock(),
  }));

  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GeoUpgradeGate } =
    await import("../src/components/geo/geo-upgrade-gate");
  const { localStorageKeys } = await import("../src/constants/storage");

  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    organization = { id: "org-fixture", slug: "fixture" };
    browser.localStorage.clear();
    push.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderGate = async () => {
    await act(async () => {
      root.render(
        <GeoUpgradeGate slug={organization.slug}>
          <div>Protected content</div>
        </GeoUpgradeGate>
      );
    });
  };

  const button = (label: string) => {
    return [...container.querySelectorAll("button")].find(
      (item) => item.textContent?.trim() === label
    );
  };

  test("remembers dismissal after revisiting and renaming, while allowing manual upgrade", async () => {
    await renderGate();
    expect(container.textContent).toContain("Close upgrade");
    expect(container.textContent).not.toContain("Protected content");

    await act(async () => {
      button("Close upgrade")?.click();
    });
    expect(
      browser.localStorage.getItem(
        localStorageKeys.geoUpgradeDismissed(organization.id)
      )
    ).toBe("1");
    expect(push).not.toHaveBeenCalled();
    await act(async () => {
      button("Finish close")?.click();
    });
    expect(push).toHaveBeenCalledWith("/fixture");

    await act(async () => root.unmount());
    root = createRoot(container);
    await renderGate();
    expect(container.textContent).not.toContain("Close upgrade");
    expect(container.textContent).toContain("Upgrade");

    organization = { ...organization, slug: "renamed" };
    await renderGate();
    expect(container.textContent).not.toContain("Close upgrade");

    await act(async () => {
      button("Upgrade")?.click();
    });
    expect(container.textContent).toContain("Close upgrade");

    await act(async () => {
      button("Close upgrade")?.click();
    });
    await act(async () => {
      button("Finish close")?.click();
    });
    expect(push).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("Close upgrade");
    organization = { id: "org-other", slug: "fixture" };
    await renderGate();
    expect(container.textContent).toContain("Close upgrade");
  });

  test("still dismisses when browser storage throws", async () => {
    const original = Object.getOwnPropertyDescriptor(browser, "localStorage");
    Object.defineProperty(browser, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("Storage unavailable");
      },
    });
    try {
      await renderGate();
      expect(container.textContent).toContain("Close upgrade");
      await act(async () => {
        button("Close upgrade")?.click();
      });
      expect(container.textContent).not.toContain("Close upgrade");
      expect(push).not.toHaveBeenCalled();
      await act(async () => {
        button("Finish close")?.click();
      });
      expect(push).toHaveBeenCalledWith("/fixture");
    } finally {
      if (original) {
        Object.defineProperty(browser, "localStorage", original);
      }
    }
  });
}
