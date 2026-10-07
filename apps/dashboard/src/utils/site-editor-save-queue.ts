import type {
  SiteEditorDraftInput,
  SiteEditorSaveQueue,
  SiteEditorSaveQueueOptions,
  SiteEditorSaveSnapshot,
  SiteEditorSaveState,
} from "@/types/site-editor";

export function createSiteEditorSaveQueue(
  options: SiteEditorSaveQueueOptions
): SiteEditorSaveQueue {
  let snapshot: SiteEditorSaveSnapshot = {
    content: null,
    state: { status: "idle" },
    revision: 0,
  };
  let pending: SiteEditorDraftInput | null = null;
  let running: Promise<void> | null = null;
  let discarding = false;
  const listeners = new Set<() => void>();

  const update = (
    state: SiteEditorSaveState,
    content = snapshot.content,
    revision = snapshot.revision
  ) => {
    snapshot = { content, state, revision };
    options.onStateChange(state);
    for (const listener of listeners) {
      listener();
    }
  };

  const flush = (): Promise<void> => {
    if (running) {
      return running;
    }
    if (!pending || discarding) {
      return Promise.resolve();
    }
    running = (async () => {
      while (pending) {
        if (discarding) {
          break;
        }
        const input = pending;
        pending = null;
        update({ status: "saving" });
        try {
          const result = await options.save(input);
          options.onSaved(input, result);
        } catch (error) {
          pending ??= input;
          if (!discarding) {
            update({ status: "error", error: options.errorMessage(error) });
          }
          return;
        }
      }
      if (!discarding) {
        update({ status: "saved" });
      }
    })().finally(() => {
      running = null;
    });
    return running;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    edit: (input) => {
      if (discarding) {
        return;
      }
      pending = input;
      update({ status: "dirty" }, input.content);
    },
    flush,
    discard: async () => {
      if (discarding) {
        return;
      }
      discarding = true;
      pending = null;
      update({ status: "discarding" });
      try {
        await running;
        pending = null;
        await options.discard();
        await options.onDiscarded();
        update({ status: "idle" }, null, snapshot.revision + 1);
      } catch (error) {
        update({ status: "error", error: options.errorMessage(error) });
        throw error;
      } finally {
        discarding = false;
      }
    },
  };
}
