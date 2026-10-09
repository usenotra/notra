import type {
  SiteEditorDraftInput,
  SiteEditorDraftReference,
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
  let observed: SiteEditorDraftReference | null = null;
  let latestInput: SiteEditorDraftInput | null = null;
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
        const input: SiteEditorDraftInput = pending;
        pending = null;
        update({ status: "saving" });
        try {
          const result = await options.save(input);
          observed = {
            draftId: result.draftId,
            draftRevision: result.draftRevision,
            sourceContext: input.sourceContext,
          };
          const queued = pending as SiteEditorDraftInput | null;
          if (queued) {
            pending = { ...queued, ...observed };
            latestInput = pending;
          } else if (latestInput) {
            latestInput = { ...latestInput, ...observed };
          }
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
      observed ??= {
        draftId: input.draftId,
        draftRevision: input.draftRevision,
        sourceContext: input.sourceContext,
      };
      pending = { ...input, ...observed };
      latestInput = pending;
      update({ status: "dirty" }, input.content);
    },
    flush,
    discard: async (input) => {
      if (discarding) {
        return;
      }
      discarding = true;
      pending = null;
      update({ status: "discarding" });
      try {
        await running;
        pending = null;
        await options.discard(observed ?? input);
        await options.onDiscarded();
        observed = null;
        latestInput = null;
        update({ status: "idle" }, null, snapshot.revision + 1);
      } catch (error) {
        pending = latestInput;
        update({ status: "error", error: options.errorMessage(error) });
        throw error;
      } finally {
        discarding = false;
      }
    },
  };
}
