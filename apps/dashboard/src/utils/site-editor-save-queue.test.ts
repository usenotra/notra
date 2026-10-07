import { expect, test } from "bun:test";

import type {
  SiteEditorDraftInput,
  SiteEditorSaveState,
} from "@/types/site-editor";

import { createSiteEditorSaveQueue } from "./site-editor-save-queue";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function input(content: string): SiteEditorDraftInput {
  return {
    organizationId: "org",
    siteId: "site",
    path: "blog/a.mdx",
    content,
    baseBlobSha: "blob",
    baseCommitSha: "commit",
  };
}

test("serializes persistence and coalesces edits arriving during a save", async () => {
  const first = deferred();
  const writes: string[] = [];
  let persisted = "";
  const queue = createSiteEditorSaveQueue({
    save: async (draft) => {
      writes.push(draft.content);
      if (writes.length === 1) {
        await first.promise;
      }
      persisted = draft.content;
      return { path: draft.path, updatedAt: new Date() };
    },
    discard: async () => {},
    onSaved: () => {},
    onDiscarded: async () => {},
    onStateChange: () => {},
    errorMessage: String,
  });
  queue.edit(input("A"));
  const saving = queue.flush();
  queue.edit(input("B"));
  queue.edit(input("C"));
  const flushing = queue.flush();
  expect(writes).toEqual(["A"]);
  expect(queue.getSnapshot().state.status).toBe("dirty");
  first.resolve();
  await Promise.all([saving, flushing]);
  expect(writes).toEqual(["A", "C"]);
  expect(persisted).toBe("C");
  expect(queue.getSnapshot().state.status).toBe("saved");
});

test("discard waits for the in-flight write and cancels queued edits", async () => {
  const first = deferred();
  const operations: string[] = [];
  let persisted: string | null = null;
  const queue = createSiteEditorSaveQueue({
    save: async (draft) => {
      await first.promise;
      operations.push(`save:${draft.content}`);
      persisted = draft.content;
      return { path: draft.path, updatedAt: new Date() };
    },
    discard: async () => {
      operations.push("discard");
      persisted = null;
    },
    onSaved: () => {},
    onDiscarded: async () => {},
    onStateChange: () => {},
    errorMessage: String,
  });
  queue.edit(input("A"));
  const saving = queue.flush();
  queue.edit(input("B"));
  const discarding = queue.discard();
  queue.edit(input("C"));
  expect(operations).toEqual([]);
  expect(queue.getSnapshot().state.status).toBe("discarding");
  first.resolve();
  await Promise.all([saving, discarding]);
  expect(operations).toEqual(["save:A", "discard"]);
  expect(persisted).toBeNull();
  expect(queue.getSnapshot()).toEqual({
    content: null,
    state: { status: "idle" },
    revision: 1,
  });
});

test("a file keeps its pending content and blocking state after its pane unsubscribes", async () => {
  const first = deferred();
  const states: SiteEditorSaveState[] = [];
  const queue = createSiteEditorSaveQueue({
    save: async (draft) => {
      await first.promise;
      return { path: draft.path, updatedAt: new Date() };
    },
    discard: async () => {},
    onSaved: () => {},
    onDiscarded: async () => {},
    onStateChange: (state) => states.push(state),
    errorMessage: String,
  });
  const unsubscribe = queue.subscribe(() => {});
  queue.edit(input("A"));
  unsubscribe();
  const leaving = queue.flush();
  expect(queue.getSnapshot().content).toBe("A");
  expect(states.at(-1)?.status).toBe("saving");
  first.resolve();
  await leaving;
  expect(states.at(-1)?.status).toBe("saved");
});

test("a failed save retains the latest edit and can be retried", async () => {
  let fails = true;
  const queue = createSiteEditorSaveQueue({
    save: async (draft) => {
      if (fails) {
        throw new Error("offline");
      }
      return { path: draft.path, updatedAt: new Date() };
    },
    discard: async () => {},
    onSaved: () => {},
    onDiscarded: async () => {},
    onStateChange: () => {},
    errorMessage: String,
  });
  queue.edit(input("A"));
  await queue.flush();
  expect(queue.getSnapshot().state.status).toBe("error");
  expect(queue.getSnapshot().content).toBe("A");
  fails = false;
  await queue.flush();
  expect(queue.getSnapshot().state.status).toBe("saved");
});

test("discard still deletes after an in-flight save fails, without retrying discarded edits", async () => {
  const first = deferred();
  let attempts = 0;
  let discarded = false;
  const queue = createSiteEditorSaveQueue({
    save: async () => {
      attempts += 1;
      await first.promise;
      throw new Error("offline");
    },
    discard: async () => {
      discarded = true;
    },
    onSaved: () => {},
    onDiscarded: async () => {},
    onStateChange: () => {},
    errorMessage: String,
  });
  queue.edit(input("A"));
  const saving = queue.flush();
  queue.edit(input("B"));
  const discarding = queue.discard();
  first.resolve();
  await Promise.all([saving, discarding]);
  await queue.flush();
  expect(attempts).toBe(1);
  expect(discarded).toBe(true);
  expect(queue.getSnapshot().state.status).toBe("idle");
});
