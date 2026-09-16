import { beforeEach, expect, mock, test } from "bun:test";

import * as navigation from "next/navigation";

const navigationExports = { ...navigation };
const access = mock(async () => ({
  organization: { id: "org-free" },
  user: { name: "Test" },
  member: null,
}));
const resolveAccess = mock(async () => ({
  hasAccess: false,
  activePlanId: null,
}));
const storedMode = mock(async () => {
  throw new Error("redirect:/fixture/geo");
});

mock.module("@/lib/auth/actions", () => ({
  validateOrganizationAccess: access,
}));
mock.module("@/lib/billing/subscription", () => ({
  resolveAiProductAccess: resolveAccess,
}));
mock.module("@/lib/nav/org-root-redirect", () => ({
  redirectOrgRootToStoredMode: storedMode,
}));
mock.module("next/navigation", () => ({
  ...navigationExports,
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("@/lib/geo/initial-project.server", () => ({
  resolveInitialGeoProjectId: mock(),
}));
mock.module("@/utils/dashboard-home-prefetch.server", () => ({
  dehydrateDashboardHomeQueries: mock(),
}));
mock.module("../src/app/(dashboard)/[slug]/page-client", () => ({
  default: () => null,
}));
mock.module("../src/app/(dashboard)/[slug]/skeleton", () => ({
  DashboardPageSkeleton: () => null,
}));

const { default: Page } = await import("../src/app/(dashboard)/[slug]/page");

beforeEach(() => {
  access.mockClear();
  resolveAccess.mockClear();
  storedMode.mockClear();
  resolveAccess.mockResolvedValue({ hasAccess: false, activePlanId: null });
});

test("organizations without AI access enter feedback", async () => {
  await expect(
    Page({
      params: Promise.resolve({ slug: "fixture" }),
      searchParams: Promise.resolve({}),
    })
  ).rejects.toThrow("redirect:/fixture/feedback");
  expect(access).toHaveBeenCalledWith("fixture");
  expect(resolveAccess).toHaveBeenCalledWith("org-free");
  expect(storedMode).not.toHaveBeenCalled();
});

test("organizations with AI credits preserve their dashboard workspace", async () => {
  resolveAccess.mockResolvedValue({ hasAccess: true, activePlanId: null });
  await expect(
    Page({
      params: Promise.resolve({ slug: "fixture" }),
      searchParams: Promise.resolve({}),
    })
  ).rejects.toThrow("redirect:/fixture/geo");
  expect(storedMode).toHaveBeenCalledTimes(1);
});

test("membership is checked before billing access", async () => {
  access.mockRejectedValueOnce(new Error("not authorized"));
  await expect(
    Page({
      params: Promise.resolve({ slug: "fixture" }),
      searchParams: Promise.resolve({}),
    })
  ).rejects.toThrow("not authorized");
  expect(resolveAccess).not.toHaveBeenCalled();
  expect(storedMode).not.toHaveBeenCalled();
});
