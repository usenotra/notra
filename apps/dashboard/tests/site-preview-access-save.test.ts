import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
  MutationObserver,
  type MutationObserverOptions,
  QueryClient,
} from "@tanstack/react-query";

import type { DashboardORPCClient } from "../src/lib/orpc/client";
import type { SitePreviewAccessPlan } from "../src/types/site-preview-access";

if (process.env.NOTRA_SITE_PREVIEW_ACCESS_SAVE_TEST_WORKER !== "1") {
  test("preview access saves through a single authorized mutation", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          NOTRA_SITE_PREVIEW_ACCESS_SAVE_TEST_WORKER: "1",
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  let client: QueryClient;
  let failure: Error | null = null;
  const invalidate = mock(async () => {});
  const success = mock();
  const error = mock();
  const request = mock(async (_path: readonly string[], _input: unknown) => {
    if (failure) {
      throw failure;
    }
    return {};
  });
  const rpc = createORPCClient<DashboardORPCClient>({
    call: (path, input) => request(path, input),
  });
  const dashboardOrpc = createTanstackQueryUtils(rpc, { path: ["dashboard"] });
  mock.module("../src/lib/orpc/query", () => ({ dashboardOrpc }));
  mock.module("../src/lib/hooks/use-sites", () => ({
    useInvalidateSites: () => invalidate,
  }));
  mock.module("use-intl", () => ({
    useTranslations: () => (key: string) => key,
  }));
  mock.module("sonner", () => ({ toast: { success, error } }));
  mock.module("@tanstack/react-query", () => ({
    useMutation: <TData, TError, TVariables, TContext>(
      options: MutationObserverOptions<TData, TError, TVariables, TContext>
    ) => {
      const observer = new MutationObserver(client, options);
      return {
        mutateAsync: (variables: TVariables) => observer.mutate(variables),
      };
    },
  }));
  const { useSavePreviewAccess } =
    await import("../src/lib/hooks/use-save-preview-access");
  const plan: SitePreviewAccessPlan = {
    previewsEnabled: true,
    previewVisibility: "protected",
    settingsChanged: false,
    password: undefined,
    passwordTooShort: false,
    isDirty: true,
  };
  beforeEach(() => {
    client?.clear();
    client = new QueryClient();
    failure = null;
    request.mockClear();
    invalidate.mockClear();
    success.mockClear();
    error.mockClear();
  });

  test.each([undefined, null, "replacement-password"])(
    "one RPC preserves the password intent %s",
    async (password) => {
      const onSaved = mock();
      await useSavePreviewAccess({
        organizationId: "org",
        siteId: "site",
        onSaved,
      }).mutateAsync({ ...plan, password });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0]).toEqual([
        ["sites", "update"],
        {
          organizationId: "org",
          siteId: "site",
          previewsEnabled: true,
          previewVisibility: "protected",
          previewPassword: password,
        },
      ]);
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith("saved");
      expect(error).not.toHaveBeenCalled();
    }
  );

  test("Off preserves access/password intent in the one update payload", async () => {
    await useSavePreviewAccess({
      organizationId: "org",
      siteId: "site",
      onSaved: mock(),
    }).mutateAsync({
      ...plan,
      previewsEnabled: false,
      previewVisibility: "public",
      settingsChanged: true,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[1]).toEqual({
      organizationId: "org",
      siteId: "site",
      previewsEnabled: false,
      previewVisibility: "public",
      previewPassword: undefined,
    });
  });

  test("failed update reports failure without a second mutation or success callbacks", async () => {
    failure = new Error("update failed");
    const onSaved = mock();
    await expect(
      useSavePreviewAccess({
        organizationId: "org",
        siteId: "site",
        onSaved,
      }).mutateAsync({
        ...plan,
        password: "replacement-password",
        settingsChanged: true,
      })
    ).rejects.toThrow("update failed");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toEqual(["sites", "update"]);
    expect(error).toHaveBeenCalledWith("update failed");
    expect(success).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
}
