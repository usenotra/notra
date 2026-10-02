import { expect, mock, test } from "bun:test";

import { Window } from "happy-dom";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const browser = new Window({
  url: "http://localhost/acme/analytics/leaderboard?range=week",
});
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  HTMLElement: browser.HTMLElement,
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});

mock.module("@/components/analytics/account-modal", () => ({
  AccountModal: ({ children }: { children: React.ReactNode }) => (
    <div data-modal>{children}</div>
  ),
}));
mock.module("@/components/analytics/account-detail-view", () => ({
  AccountDetailView: ({ handle }: { handle: string }) => <span>{handle}</span>,
}));

const {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} = await import("@tanstack/react-router");
const { default: Link } = await import("../../src/components/framework/link");
const { usePathname, useRouter, useSearchParams } =
  await import("../../src/lib/navigation");
const { UiModalProvider } = await import("../../src/routes/-ui-modal");

test("masked links and imperative navigation retain the mounted background, local state and scroll", async () => {
  let mounts = 0;
  let unmounts = 0;
  let pending: Promise<void> | undefined;
  function Background() {
    const [count, setCount] = useState(0);
    const navigation = useRouter();
    const pathname = usePathname();
    const search = useSearchParams();
    useEffect(() => {
      mounts += 1;
      return () => {
        unmounts += 1;
      };
    }, []);
    return (
      <div data-background>
        <output data-visible-url>{`${pathname}?${search.toString()}`}</output>
        <button
          data-count
          onClick={() => setCount((value) => value + 1)}
          type="button"
        >
          {count}
        </button>
        <Link href="/acme/analytics/accounts/alice?range=month">Alice</Link>
        <button
          data-imperative
          onClick={() => navigation.push("/acme/analytics/accounts/bob")}
          type="button"
        >
          Bob
        </button>
        <button
          data-replace
          onClick={() => navigation.replace("/acme/analytics/accounts/carol")}
          type="button"
        >
          Carol
        </button>
      </div>
    );
  }
  const rootRoute = createRootRoute({
    component: () => (
      <UiModalProvider>
        <Outlet />
      </UiModalProvider>
    ),
  });
  const background = createRoute({
    getParentRoute: () => rootRoute,
    path: "/$slug/analytics/leaderboard",
    validateSearch: (search: Record<string, unknown>) => search,
    beforeLoad: () => pending,
    component: Background,
  });
  const detail = createRoute({
    getParentRoute: () => rootRoute,
    path: "/$slug/analytics/accounts/$handle",
    component: () => <div data-standalone />,
  });
  const history = createMemoryHistory({
    initialEntries: ["/acme/analytics/leaderboard?range=week"],
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([background, detail]),
    history,
    origin: "http://localhost",
    isServer: false,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
  await router.load();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<RouterProvider router={router} />);
  });
  const page = host.querySelector<HTMLElement>("[data-background]");
  const count = host.querySelector<HTMLButtonElement>("[data-count]");
  const link = host.querySelector<HTMLAnchorElement>("a");
  if (!page || !count || !link) {
    throw new Error("Background did not mount");
  }
  page.scrollTop = 174;
  await act(async () => {
    count.click();
  });
  expect(link.getAttribute("href")).toBe(
    "/acme/analytics/accounts/alice?range=month"
  );
  let finishPending = () => {};
  pending = new Promise<void>((resolve) => {
    finishPending = resolve;
  });
  await act(async () => {
    link.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(host.querySelector("[data-background]")).toBe(page);
  expect(count.textContent).toBe("1");
  expect(page.scrollTop).toBe(174);
  expect(unmounts).toBe(0);
  expect(router.state.isLoading).toBe(true);
  await act(async () => {
    finishPending();
    pending = undefined;
    await router.load();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(host.querySelector("[data-background]")).toBe(page);
  expect(page.scrollTop).toBe(174);
  expect(count.textContent).toBe("1");
  expect(host.querySelector("[data-modal]")?.textContent).toBe("alice");
  expect(host.querySelector("[data-standalone]")).toBeNull();
  expect(router.state.location.search).toEqual({ range: "week" });
  expect(host.querySelector("[data-visible-url]")?.textContent).toBe(
    "/acme/analytics/accounts/alice?range=month"
  );
  expect(mounts).toBe(1);
  expect(unmounts).toBe(0);
  await act(async () => {
    history.back();
    await router.load();
  });
  expect(host.querySelector("[data-modal]")).toBeNull();
  expect(host.querySelector("[data-background]")).toBe(page);
  expect(host.querySelector("[data-visible-url]")?.textContent).toBe(
    "/acme/analytics/leaderboard?range=week"
  );
  await act(async () => {
    history.forward();
    await router.load();
  });
  expect(host.querySelector("[data-modal]")?.textContent).toBe("alice");
  await act(async () => {
    history.back();
    await router.load();
  });
  await act(async () => {
    host.querySelector<HTMLButtonElement>("[data-imperative]")?.click();
    await router.load();
  });
  expect(host.querySelector("[data-modal]")?.textContent).toBe("bob");
  expect(host.querySelector("[data-background]")).toBe(page);
  expect(count.textContent).toBe("1");
  expect(page.scrollTop).toBe(174);
  expect(mounts).toBe(1);
  expect(unmounts).toBe(0);
  const historyLength = history.length;
  await act(async () => {
    host.querySelector<HTMLButtonElement>("[data-replace]")?.click();
    await router.load();
  });
  expect(history.length).toBe(historyLength);
  expect(host.querySelector("[data-modal]")?.textContent).toBe("carol");
  expect(host.querySelector("[data-background]")).toBe(page);
  expect(count.textContent).toBe("1");
  expect(page.scrollTop).toBe(174);
  await act(async () => {
    history.back();
    await router.load();
  });
  expect(host.querySelector("[data-modal]")).toBeNull();
  expect(history.location.href).toBe("/acme/analytics/leaderboard?range=week");
  await act(async () => {
    history.forward();
    await router.load();
  });
  expect(host.querySelector("[data-modal]")?.textContent).toBe("carol");
  await act(async () => {
    root.unmount();
  });
  const reloaded = createRouter({
    routeTree: rootRoute.addChildren([background, detail]),
    history,
    origin: "http://localhost",
    isServer: false,
  });
  await reloaded.load();
  const reloadedRoot = createRoot(host);
  await act(async () => {
    reloadedRoot.render(<RouterProvider router={reloaded} />);
  });
  expect(host.querySelector("[data-standalone]")).not.toBeNull();
  expect(host.querySelector("[data-modal]")).toBeNull();
  expect(host.querySelector("[data-background]")).toBeNull();
  expect(reloaded.state.location.pathname).toBe(
    "/acme/analytics/accounts/carol"
  );
  await act(async () => {
    reloadedRoot.unmount();
  });
  await browser.happyDOM.close();
});
