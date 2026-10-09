import { expect, mock, test } from "bun:test";
import { setTimeout as sleep } from "node:timers/promises";

import type { SiteIntegrationUpdate } from "@notra/sites-core/types/site-integrations";

import { SITE_INTEGRATION_AUTOSAVE_DELAY_MS } from "@/constants/site-integrations";
import type { SiteIntegrationAutosaveState } from "@/types/site-integrations";

import { createSiteIntegrationAutosave } from "./site-integration-autosave";

const initial: SiteIntegrationUpdate = { provider: "umami", settings: null };
const first: SiteIntegrationUpdate = {
  provider: "umami",
  settings: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409" },
};
const latest: SiteIntegrationUpdate = {
  provider: "umami",
  settings: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670410" },
};

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("opening and unchanged settings do not write; valid edits save automatically", async () => {
  const save = mock(async () => {});
  const states: SiteIntegrationAutosaveState[] = [];
  const queue = createSiteIntegrationAutosave({
    initial,
    save,
    onChange: (state) => states.push(state),
  });
  expect(await queue.flush()).toBe(true);
  expect(save).not.toHaveBeenCalled();
  queue.update(first);
  queue.update(latest);
  await sleep(SITE_INTEGRATION_AUTOSAVE_DELAY_MS + 100);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenLastCalledWith(latest);
  expect(states.at(-1)).toMatchObject({
    status: "saved",
    dirty: false,
    hasIntegration: true,
  });
  queue.update(latest);
  expect(await queue.flush()).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);
  queue.clearTimer();
});

test("flush saves before the debounce expires", async () => {
  const save = mock(async () => {});
  const queue = createSiteIntegrationAutosave({
    initial,
    save,
    onChange: () => {},
  });
  queue.update(first);
  expect(await queue.flush()).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(first);
});

test("edits during a slow save are serialized and only the latest queued edit is written", async () => {
  const blocked = deferred();
  const started = deferred();
  const writes: SiteIntegrationUpdate[] = [];
  const queue = createSiteIntegrationAutosave({
    initial,
    onChange: () => {},
    save: async (update) => {
      writes.push(update);
      if (writes.length === 1) {
        started.resolve();
        await blocked.promise;
      }
    },
  });
  queue.update(first);
  const flushing = queue.flush();
  await started.promise;
  queue.update({
    provider: "umami",
    settings: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670411" },
  });
  queue.update(latest);
  const closing = queue.flush();
  expect(writes).toEqual([first]);
  blocked.resolve();
  expect(await flushing).toBe(true);
  expect(await closing).toBe(true);
  expect(writes).toEqual([first, latest]);
});

test("an invalid edit cancels a pending valid save", async () => {
  const save = mock(async () => {});
  const queue = createSiteIntegrationAutosave({
    initial,
    save,
    onChange: () => {},
  });
  queue.update(first);
  queue.update(null);
  expect(await queue.flush()).toBe(false);
  expect(save).not.toHaveBeenCalled();
});

test("failed saves remain dirty and retry writes the current settings", async () => {
  const states: SiteIntegrationAutosaveState[] = [];
  let fail = true;
  const save = mock(async () => {
    if (fail) {
      throw new Error("Network failed");
    }
  });
  const queue = createSiteIntegrationAutosave({
    initial,
    save,
    onChange: (state) => states.push(state),
  });
  queue.update(first);
  expect(await queue.flush()).toBe(false);
  expect(states.at(-1)).toMatchObject({
    status: "error",
    dirty: true,
    hasIntegration: false,
  });
  fail = false;
  expect(await queue.flush()).toBe(true);
  expect(states.at(-1)).toMatchObject({ status: "saved", dirty: false });
  expect(save).toHaveBeenCalledTimes(2);
});

test("removing during a save runs last and cannot reconnect the provider", async () => {
  const blocked = deferred();
  const started = deferred();
  const writes: SiteIntegrationUpdate[] = [];
  const queue = createSiteIntegrationAutosave({
    initial,
    onChange: () => {},
    save: async (update) => {
      writes.push(update);
      if (writes.length === 1) {
        started.resolve();
        await blocked.promise;
      }
    },
  });
  queue.update(first);
  const flushing = queue.flush();
  await started.promise;
  queue.update(initial);
  const removing = queue.flush();
  blocked.resolve();
  expect(await removing).toBe(true);
  expect(await flushing).toBe(true);
  expect(writes).toEqual([first, initial]);
});

test("discarding unsaved edits waits for an in-flight save without writing queued edits", async () => {
  const blocked = deferred();
  const started = deferred();
  const writes: SiteIntegrationUpdate[] = [];
  const queue = createSiteIntegrationAutosave({
    initial,
    onChange: () => {},
    save: async (update) => {
      writes.push(update);
      started.resolve();
      await blocked.promise;
    },
  });
  queue.update(first);
  const flushing = queue.flush();
  await started.promise;
  queue.update(latest);
  const cancelling = queue.cancel();
  blocked.resolve();
  await cancelling;
  expect(await flushing).toBe(false);
  expect(writes).toEqual([first]);
  expect(await queue.flush()).toBe(false);
  expect(writes).toEqual([first]);
});

test("canceling a failed removal prevents unmount flush from retrying it", async () => {
  let fail = true;
  const save = mock(async () => {
    if (fail) {
      throw new Error("Removal failed");
    }
  });
  const queue = createSiteIntegrationAutosave({
    initial: first,
    save,
    onChange: () => {},
  });
  queue.update(initial);
  expect(await queue.flush()).toBe(false);
  await queue.cancel();
  expect(await queue.flush()).toBe(false);
  expect(save).toHaveBeenCalledTimes(1);
  fail = false;
  queue.update(initial);
  expect(await queue.flush()).toBe(true);
  expect(save).toHaveBeenCalledTimes(2);
});
