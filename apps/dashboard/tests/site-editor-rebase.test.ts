import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
  MutationObserver,
  type MutationObserverOptions,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";

import type { DashboardORPCClient } from "../src/lib/orpc/client";
import type { SiteEditorDraftInput } from "../src/types/site-editor";
import { createSiteEditorSaveQueue } from "../src/utils/site-editor-save-queue";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

if (!process.env.NOTRA_SITE_EDITOR_REBASE_TEST_WORKER) {
  test("editor rebase refreshes authoritative query caches before immediate edits", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_SITE_EDITOR_REBASE_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const scope = { organizationId: "org", siteId: "site" };
  let client: QueryClient;
  let rebase: (path: string) => Promise<void>;
  let read: (path: string) => Promise<void>;
  const readCalls: string[] = [];
  const rpc = createORPCClient<DashboardORPCClient>({
    call: async (path, input) => {
      const { path: file } = input as { path: string };
      switch (path.join(".")) {
        case "sites.editor.rebaseDraft":
          await rebase(file);
          return { path: file };
        case "sites.editor.read":
          readCalls.push(file);
          await read(file);
          return {
            path: file,
            content: `draft:${file}`,
            published: `upstream:${file}`,
            blobSha: `new:${file}`,
            publishedBlobSha: `new:${file}`,
            hasDraft: true,
          };
        case "sites.editor.files":
          return { commitSha: "new-commit", files: [], drafts: [] };
        default:
          throw new Error(`Unexpected procedure: ${path.join(".")}`);
      }
    },
  });
  const dashboardOrpc = createTanstackQueryUtils(rpc, {
    path: ["dashboard"],
  });
  mock.module("../src/lib/orpc/query", () => ({ dashboardOrpc }));
  mock.module("use-intl", () => ({
    useTranslations: () => (key: string) => key,
  }));
  mock.module("sonner", () => ({ toast: { success: mock(), error: mock() } }));
  mock.module("@tanstack/react-query", () => ({
    useQueryClient: () => client,
    useMutation: <TData, TError, TVariables, TContext>(
      options: MutationObserverOptions<TData, TError, TVariables, TContext>
    ) => {
      const observer = new MutationObserver(client, options);
      return {
        mutateAsync: (variables: TVariables) => observer.mutate(variables),
      };
    },
  }));
  const { useRebaseSiteDrafts } =
    await import("../src/lib/hooks/use-site-editor-files");

  const filesOptions = dashboardOrpc.sites.editor.files.queryOptions({
    input: scope,
  });
  const readOptions = (path: string) =>
    dashboardOrpc.sites.editor.read.queryOptions({ input: { ...scope, path } });
  const seed = (path: string) => {
    client.setQueryData(readOptions(path).queryKey, {
      path,
      content: `draft:${path}`,
      published: `old:${path}`,
      blobSha: `old:${path}`,
      publishedBlobSha: `old:${path}`,
      hasDraft: true,
    });
  };

  beforeEach(() => {
    client?.clear();
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      },
    });
    rebase = async () => {};
    read = async () => {};
    readCalls.length = 0;
    client.setQueryData(filesOptions.queryKey, {
      commitSha: "old-commit",
      files: [],
      drafts: [],
    });
  });

  test("active and inactive exact read keys are authoritative before the remount and next save", async () => {
    seed("blog/active.mdx");
    seed("blog/inactive.mdx");
    seed("blog/untouched.mdx");
    const otherScope = { ...scope, siteId: "other", path: "blog/active.mdx" };
    const otherKey = dashboardOrpc.sites.editor.read.queryKey({
      input: otherScope,
    });
    client.setQueryData(otherKey, {
      path: otherScope.path,
      content: "other",
      published: "other",
      blobSha: "other",
      publishedBlobSha: "other",
      hasDraft: false,
    });
    const observer = new QueryObserver(client, readOptions("blog/active.mdx"));
    const unsubscribe = observer.subscribe(() => {});
    const saved: SiteEditorDraftInput[] = [];
    const onRebased = mock(() => {
      for (const path of ["blog/active.mdx", "blog/inactive.mdx"]) {
        const document = client.getQueryData(readOptions(path).queryKey);
        expect(document?.blobSha).toBe(`new:${path}`);
        expect(document?.published).toBe(`upstream:${path}`);
        const queue = createSiteEditorSaveQueue({
          save: async (input) => {
            saved.push(input);
            return { path, updatedAt: new Date() };
          },
          discard: async () => {},
          onSaved: () => {},
          onDiscarded: async () => {},
          onStateChange: () => {},
          errorMessage: String,
        });
        queue.edit({
          ...scope,
          path,
          content: "immediate edit",
          baseBlobSha: document?.blobSha ?? null,
          baseCommitSha:
            client.getQueryData(filesOptions.queryKey)?.commitSha ?? null,
        });
        void queue.flush();
      }
    });
    await useRebaseSiteDrafts({ ...scope, onRebased }).mutateAsync([
      "blog/active.mdx",
      "blog/inactive.mdx",
    ]);
    unsubscribe();
    expect(onRebased).toHaveBeenCalledTimes(1);
    expect(readCalls.sort()).toEqual(["blog/active.mdx", "blog/inactive.mdx"]);
    expect(saved.map((input) => input.baseBlobSha)).toEqual([
      "new:blog/active.mdx",
      "new:blog/inactive.mdx",
    ]);
    expect(saved.every((input) => input.baseCommitSha === "new-commit")).toBe(
      true
    );
    expect(
      client.getQueryData(readOptions("blog/untouched.mdx").queryKey)?.blobSha
    ).toBe("old:blog/untouched.mdx");
    expect(client.getQueryData(otherKey)?.blobSha).toBe("other");
  });

  test("the completion callback waits for inactive read refetches", async () => {
    seed("blog/inactive.mdx");
    const fetching = deferred();
    const response = deferred();
    read = async () => {
      fetching.resolve();
      await response.promise;
    };
    const onRebased = mock();
    const pending = useRebaseSiteDrafts({ ...scope, onRebased }).mutateAsync([
      "blog/inactive.mdx",
    ]);
    await fetching.promise;
    expect(onRebased).not.toHaveBeenCalled();
    expect(
      client.getQueryData(readOptions("blog/inactive.mdx").queryKey)
    ).toBeUndefined();
    response.resolve();
    await pending;
    expect(onRebased).toHaveBeenCalledTimes(1);
  });

  test("a pre-rebase read in flight cannot overwrite the refreshed base", async () => {
    const path = "blog/racing.mdx";
    seed(path);
    const started = deferred();
    const response = deferred();
    read = async () => {
      if (readCalls.length === 1) {
        started.resolve();
        await response.promise;
        throw new Error("obsolete read");
      }
    };
    const obsolete = client
      .fetchQuery({ ...readOptions(path), staleTime: 0 })
      .catch((error: unknown) => error);
    await started.promise;
    const onRebased = mock();
    await useRebaseSiteDrafts({ ...scope, onRebased }).mutateAsync([path]);
    response.resolve();
    await obsolete;
    expect(onRebased).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(readOptions(path).queryKey)?.blobSha).toBe(
      `new:${path}`
    );
    expect(client.getQueryState(readOptions(path).queryKey)?.status).toBe(
      "success"
    );
  });

  test("a partial backend failure waits for every rebase and refreshes all affected paths", async () => {
    seed("blog/failed.mdx");
    seed("blog/settling.mdx");
    const started = deferred();
    const settled = deferred();
    rebase = async (path) => {
      if (path === "blog/failed.mdx") {
        throw new Error("rebase failed");
      }
      started.resolve();
      await settled.promise;
    };
    const onRebased = mock();
    const pending = useRebaseSiteDrafts({ ...scope, onRebased }).mutateAsync([
      "blog/failed.mdx",
      "blog/settling.mdx",
    ]);
    const rejected = pending.catch((error: unknown) => error);
    await started.promise;
    expect(readCalls).toEqual([]);
    settled.resolve();
    expect(await rejected).toEqual(new Error("rebase failed"));
    expect(readCalls.sort()).toEqual(["blog/failed.mdx", "blog/settling.mdx"]);
    expect(
      client.getQueryData(readOptions("blog/settling.mdx").queryKey)?.blobSha
    ).toBe("new:blog/settling.mdx");
    expect(client.getQueryData(filesOptions.queryKey)?.commitSha).toBe(
      "new-commit"
    );
    expect(onRebased).not.toHaveBeenCalled();
  });

  test("a failed authoritative read cannot retain its stale cached base or report rebase complete", async () => {
    seed("blog/failed.mdx");
    read = async () => {
      throw new Error("read failed");
    };
    const onRebased = mock();
    await expect(
      useRebaseSiteDrafts({ ...scope, onRebased }).mutateAsync([
        "blog/failed.mdx",
      ])
    ).rejects.toThrow("read failed");
    expect(
      client.getQueryData(readOptions("blog/failed.mdx").queryKey)
    ).toBeUndefined();
    expect(
      client.getQueryState(readOptions("blog/failed.mdx").queryKey)?.status
    ).toBe("error");
    expect(onRebased).not.toHaveBeenCalled();
  });
}
