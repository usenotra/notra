import {
  type AnyRouter,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";

import { createUiRoute } from "@/routes/-ui-route";

let rejectData: (error: unknown) => void = () => undefined;
let resolveData: (data: string) => void = () => undefined;

function Controls() {
  const [prefetched, setPrefetched] = useState(false);
  return (
    <main className="space-y-4 p-6">
      <div className="flex gap-4">
        <button
          onClick={() => {
            void router.navigate({ href: "/traffic" });
          }}
          type="button"
        >
          Open traffic
        </button>
        <button
          onClick={() => {
            void router.navigate({ href: "/other" });
          }}
          type="button"
        >
          Open other page
        </button>
        <button
          onClick={async () => {
            await router.preloadRoute({ to: "/traffic" });
            setPrefetched(true);
          }}
          type="button"
        >
          Prefetch traffic
        </button>
        <button
          onClick={() => {
            rejectData(redirect({ href: "/login?test=redirect" }));
          }}
          type="button"
        >
          Expire access
        </button>
        <button
          onClick={() => {
            rejectData(new Error("Data loading failed"));
          }}
          type="button"
        >
          Fail data
        </button>
        <button
          onClick={() => {
            resolveData("Traffic ready");
          }}
          type="button"
        >
          Resolve data
        </button>
      </div>
      {prefetched ? <p>Traffic prefetched</p> : null}
      <Outlet />
    </main>
  );
}

const root = createRootRoute({ component: Controls });
const home = createUiRoute({
  parent: root,
  path: "/",
  component: () => <h1>Fixture home</h1>,
});
const traffic = createUiRoute({
  parent: root,
  path: "traffic",
  stream: true,
  gate: async () => undefined,
  loader: () =>
    new Promise<string>((resolve, reject) => {
      resolveData = resolve;
      rejectData = reject;
    }),
  pendingComponent: () => <h1>Traffic loading</h1>,
  component: ({ data }) => <h1>{data}</h1>,
});
const other = createUiRoute({
  parent: root,
  path: "other",
  component: () => <h1>Other page</h1>,
});
const login = createUiRoute({
  parent: root,
  path: "login",
  component: () => <h1>Redirect destination</h1>,
});
const router: AnyRouter = createRouter({
  routeTree: root.addChildren([home, traffic, other, login]),
  history: createMemoryHistory({
    initialEntries: [
      typeof window !== "undefined" && window.location.pathname === "/login"
        ? "/login"
        : "/",
    ],
  }),
  defaultPreloadStaleTime: 30_000,
  defaultStaleTime: 30_000,
  defaultPendingMs: 0,
  defaultPendingMinMs: 0,
  defaultErrorComponent: ({ error }) => (
    <h1>{error instanceof Error ? error.message : String(error)}</h1>
  ),
});

export function RedirectFixture() {
  return <RouterProvider router={router} />;
}
