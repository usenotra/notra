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
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { DashboardORPCClient } from "../src/lib/orpc/client";
import type {
  SiteEditorDraftInput,
  SiteEditorDraftReference,
  SiteEditorDraftResult,
} from "../src/types/site-editor";
import { createSiteEditorSaveQueue } from "../src/utils/site-editor-save-queue";
import {
  partialRebasePaths,
  scope,
  sourceContext,
} from "./constants/site-editor";
import type { SiteEditorQueueHarnessProps } from "./types/site-editor";

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
  let client: QueryClient;
  let rebase: (path: string) => Promise<void>;
  let read: (path: string) => Promise<void>;
  let persist: (input: SiteEditorDraftInput) => Promise<SiteEditorDraftResult>;
  let remove: (
    input: SiteEditorDraftReference & { path: string }
  ) => Promise<void>;
  let readRevision: (path: string) => number;
  const saveCalls: SiteEditorDraftInput[] = [];
  const discardCalls: (SiteEditorDraftReference & { path: string })[] = [];
  const onSettled = mock();
  const readCalls: string[] = [];
  const rpc = createORPCClient<DashboardORPCClient>({
    call: async (path, input) => {
      const { path: file } = input as { path: string };
      switch (path.join(".")) {
        case "sites.editor.rebaseDraft":
          expect(input).toMatchObject({
            draftId: `drf-${file}`,
            draftRevision: 1,
            sourceContext,
          });
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
            draftId: `drf-${file}`,
            draftRevision: readRevision(file),
            sourceContext,
          };
        case "sites.editor.files":
          return {
            commitSha: "new-commit",
            sourceContext,
            files: [],
            drafts: [],
          };
        case "sites.editor.saveDraft": {
          const draft = input as SiteEditorDraftInput;
          saveCalls.push(draft);
          return await persist(draft);
        }
        case "sites.editor.discardDraft": {
          const draft = input as SiteEditorDraftReference & { path: string };
          discardCalls.push(draft);
          await remove(draft);
          return { ok: true };
        }
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
  const { useSiteEditorSaves } =
    await import("../src/lib/hooks/use-site-editor-saves");
  const createSaves = () => {
    let saves: ReturnType<typeof useSiteEditorSaves> | undefined;
    function Harness({ onReady }: SiteEditorQueueHarnessProps) {
      const queues = useSiteEditorSaves(scope, () => {});
      onReady(queues);
      return null;
    }
    renderToStaticMarkup(
      createElement(Harness, {
        onReady: (queues) => {
          saves = queues;
        },
      })
    );
    if (!saves) {
      throw new Error("Expected editor queue owner");
    }
    return saves;
  };

  const filesOptions = dashboardOrpc.sites.editor.files.queryOptions({
    input: scope,
  });
  const readOptions = (path: string) =>
    dashboardOrpc.sites.editor.read.queryOptions({ input: { ...scope, path } });
  const seed = (path: string) => {
    client.setQueryData(filesOptions.queryKey, (current) =>
      current
        ? {
            ...current,
            drafts: [
              ...current.drafts,
              {
                path,
                id: `drf-${path}`,
                revision: 1,
                deleted: false,
                baseBlobSha: `old:${path}`,
                updatedAt: new Date(),
              },
            ],
          }
        : current
    );
    client.setQueryData(readOptions(path).queryKey, {
      path,
      content: `draft:${path}`,
      published: `old:${path}`,
      blobSha: `old:${path}`,
      publishedBlobSha: `old:${path}`,
      hasDraft: true,
      draftId: `drf-${path}`,
      draftRevision: 1,
      sourceContext,
    });
  };
  const documentInput = (
    path: string,
    content: string
  ): SiteEditorDraftInput => {
    const document = client.getQueryData(readOptions(path).queryKey);
    if (!document) {
      throw new Error("Expected authoritative document");
    }
    return {
      ...scope,
      path,
      content,
      baseBlobSha: document.blobSha,
      baseCommitSha:
        client.getQueryData(filesOptions.queryKey)?.commitSha ?? null,
      draftId: document.draftId,
      draftRevision: document.draftRevision,
      sourceContext: document.sourceContext,
    };
  };
  const preparePartialRebase = async () => {
    const { first, second, untouched } = partialRebasePaths;
    for (const path of [first, second, untouched]) {
      seed(path);
    }
    const revisions = new Map([
      [first, 0],
      [second, 1],
      [untouched, 0],
    ]);
    readRevision = (path) => revisions.get(path) ?? 1;
    persist = async (input) => {
      if (
        input.draftId !== `drf-${input.path}` ||
        input.draftRevision !== revisions.get(input.path)
      ) {
        throw new Error("draft conflict");
      }
      const revision = (input.draftRevision ?? -1) + 1;
      revisions.set(input.path, revision);
      return {
        path: input.path,
        draftId: `drf-${input.path}`,
        draftRevision: revision,
        updatedAt: new Date(),
      };
    };
    remove = async (input) => {
      if (
        input.draftId !== `drf-${input.path}` ||
        input.draftRevision !== revisions.get(input.path)
      ) {
        throw new Error("draft conflict");
      }
    };
    const saves = createSaves();
    const original = saves.getQueue(first);
    const unaffected = saves.getQueue(untouched);
    for (const [path, queue] of [
      [first, original],
      [untouched, unaffected],
    ] as const) {
      queue.edit({ ...documentInput(path, `draft:${path}`), draftRevision: 0 });
      await queue.flush();
      expect(queue.getSnapshot().state.status).toBe("saved");
    }
    saveCalls.length = 0;
    rebase = async (path) => {
      if (path === second) {
        throw new Error("rebase failed");
      }
      revisions.set(path, (revisions.get(path) ?? 1) + 1);
    };
    let replaced: string[] = [];
    const reconciled = mock((paths: readonly string[]) => {
      replaced = saves.resetClean(paths);
    });
    return {
      saves,
      original,
      unaffected,
      onRebased: mock(),
      reconciled,
      replaced: () => replaced,
    };
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
    readRevision = () => 2;
    persist = async (input) => ({
      path: input.path,
      draftId: `drf-${input.path}`,
      draftRevision: (input.draftRevision ?? -1) + 1,
      updatedAt: new Date(),
    });
    remove = async () => {};
    readCalls.length = 0;
    saveCalls.length = 0;
    discardCalls.length = 0;
    onSettled.mockClear();
    client.setQueryData(filesOptions.queryKey, {
      commitSha: "old-commit",
      sourceContext,
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
      draftId: null,
      draftRevision: null,
      sourceContext,
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
            return {
              path,
              updatedAt: new Date(),
              draftId: `drf-${path}`,
              draftRevision: 3,
            };
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
          draftId: document?.draftId ?? null,
          draftRevision: document?.draftRevision ?? null,
          sourceContext,
        });
        void queue.flush();
      }
    });
    await useRebaseSiteDrafts({ ...scope, onRebased, onSettled }).mutateAsync([
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
    expect(saved.every((input) => input.draftRevision === 2)).toBe(true);
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
    const pending = useRebaseSiteDrafts({
      ...scope,
      onRebased,
      onSettled,
    }).mutateAsync(["blog/inactive.mdx"]);
    await fetching.promise;
    expect(onRebased).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
    expect(
      client.getQueryData(readOptions("blog/inactive.mdx").queryKey)
    ).toBeUndefined();
    response.resolve();
    await pending;
    expect(onRebased).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(["blog/inactive.mdx"]);
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
    await useRebaseSiteDrafts({ ...scope, onRebased, onSettled }).mutateAsync([
      path,
    ]);
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
    const pending = useRebaseSiteDrafts({
      ...scope,
      onRebased,
      onSettled,
    }).mutateAsync(["blog/failed.mdx", "blog/settling.mdx"]);
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
      useRebaseSiteDrafts({ ...scope, onRebased, onSettled }).mutateAsync([
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

  test.each(["save", "discard"])(
    "a successful path in a partially failed rebase uses its refreshed revision for the next %s",
    async (action) => {
      const prepared = await preparePartialRebase();
      const { first, second, untouched } = partialRebasePaths;
      await expect(
        useRebaseSiteDrafts({
          ...scope,
          onRebased: prepared.onRebased,
          onSettled: prepared.reconciled,
        }).mutateAsync([first, second])
      ).rejects.toThrow("rebase failed");
      expect(prepared.reconciled).toHaveBeenCalledWith([first, second]);
      expect(prepared.onRebased).not.toHaveBeenCalled();
      expect(prepared.replaced()).toEqual([first]);
      expect(prepared.saves.getQueue(untouched)).toBe(prepared.unaffected);
      const fresh = prepared.saves.getQueue(first);
      expect(fresh).not.toBe(prepared.original);
      const next = documentInput(first, "next edit");
      expect(next.draftRevision).toBe(2);
      expect(next.baseBlobSha).toBe(`new:${first}`);
      if (action === "save") {
        fresh.edit(next);
        await fresh.flush();
        expect(fresh.getSnapshot().state.status).toBe("saved");
        expect(saveCalls[0]).toMatchObject({
          draftId: `drf-${first}`,
          draftRevision: 2,
          sourceContext,
          baseBlobSha: `new:${first}`,
          baseCommitSha: "new-commit",
        });
      } else {
        await fresh.discard(next);
        expect(discardCalls[0]).toMatchObject({
          draftId: `drf-${first}`,
          draftRevision: 2,
          sourceContext,
        });
        expect(fresh.getSnapshot().state.status).toBe("idle");
      }
    }
  );

  test("failed refresh after partial rebase removes a clean stale queue without fabricating a new observation", async () => {
    const prepared = await preparePartialRebase();
    const { first, second } = partialRebasePaths;
    read = async (path) => {
      if (path === first) {
        throw new Error("read failed");
      }
    };
    await expect(
      useRebaseSiteDrafts({
        ...scope,
        onRebased: prepared.onRebased,
        onSettled: prepared.reconciled,
      }).mutateAsync([first, second])
    ).rejects.toThrow("rebase failed");
    expect(client.getQueryData(readOptions(first).queryKey)).toBeUndefined();
    expect(client.getQueryState(readOptions(first).queryKey)?.status).toBe(
      "error"
    );
    expect(prepared.replaced()).toEqual([first]);
    const fresh = prepared.saves.getQueue(first);
    expect(fresh).not.toBe(prepared.original);
    expect(fresh.getSnapshot()).toMatchObject({
      content: null,
      state: { status: "idle" },
    });
    await fresh.flush();
    expect(saveCalls).toEqual([]);
    expect(discardCalls).toEqual([]);
    expect(prepared.onRebased).not.toHaveBeenCalled();
  });

  test.each(["dirty", "inflight"])(
    "settled reconciliation retains %s local content and its original CAS observation",
    async (mode) => {
      const prepared = await preparePartialRebase();
      const { first, second } = partialRebasePaths;
      const response = deferred();
      const started = deferred();
      let saving: Promise<void> | undefined;
      prepared.original.edit(documentInput(first, `${mode} local content`));
      if (mode === "inflight") {
        const currentPersist = persist;
        persist = async (input) => {
          started.resolve();
          await response.promise;
          return await currentPersist(input);
        };
        saving = prepared.original.flush();
        await started.promise;
      }
      await expect(
        useRebaseSiteDrafts({
          ...scope,
          onRebased: prepared.onRebased,
          onSettled: prepared.reconciled,
        }).mutateAsync([first, second])
      ).rejects.toThrow("rebase failed");
      expect(prepared.replaced()).toEqual([]);
      expect(prepared.saves.getQueue(first)).toBe(prepared.original);
      expect(prepared.original.getSnapshot()).toMatchObject({
        content: `${mode} local content`,
        state: { status: mode === "dirty" ? "dirty" : "saving" },
      });
      expect(
        client.getQueryData(readOptions(first).queryKey)?.draftRevision
      ).toBe(2);
      if (mode === "dirty") {
        prepared.original.edit(documentInput(first, `${mode} local content`));
      }
      response.resolve();
      if (saving) {
        await saving;
      } else {
        await prepared.original.flush();
      }
      expect(saveCalls[0]?.draftRevision).toBe(1);
      expect(prepared.original.getSnapshot()).toMatchObject({
        content: `${mode} local content`,
        state: { status: "error" },
      });
      expect(prepared.onRebased).not.toHaveBeenCalled();
    }
  );
}
