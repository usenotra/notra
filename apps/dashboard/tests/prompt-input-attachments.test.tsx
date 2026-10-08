import { expect, mock, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type {
  AttachmentsContext,
  PromptInputProps,
} from "@notra/ui/components/ai-elements/prompt-input";
import { type EffectCallback, type ReactNode, useEffect } from "react";
import { renderToStaticMarkup } from "react-dom/server";

if (!process.env.NOTRA_PROMPT_ATTACHMENTS_TEST_WORKER) {
  test("prompt attachment ownership survives queued updates and replay", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_PROMPT_ATTACHMENTS_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const react = await import("react");
  const states: unknown[] = [];
  const refs: { current: unknown }[] = [];
  const pending = new Map<number, unknown[]>();
  const effects: EffectCallback[] = [];
  let stateIndex = 0;
  let refIndex = 0;
  let updaterCalls = 0;

  mock.module("react", () => ({
    ...react,
    useState(initial: unknown) {
      const index = stateIndex++;
      if (index === states.length) {
        states.push(typeof initial === "function" ? initial() : initial);
      }
      return [
        states[index],
        (update: unknown) => {
          const queued = pending.get(index) ?? [];
          queued.push(update);
          pending.set(index, queued);
        },
      ];
    },
    useRef(initial: unknown) {
      const index = refIndex++;
      if (index === refs.length) {
        refs.push({ current: initial });
      }
      return refs[index];
    },
    useEffect: (effect: EffectCallback) => effects.push(effect),
  }));

  const { PromptInput, PromptInputProvider, usePromptInputAttachments } =
    await import("@notra/ui/components/ai-elements/prompt-input");
  let captured: AttachmentsContext | undefined;
  const allocated: string[] = [];
  const revoked: string[] = [];
  let failAt = Number.POSITIVE_INFINITY;
  const createUrl = spyOn(URL, "createObjectURL").mockImplementation(() => {
    if (allocated.length === failAt) {
      throw new Error("Synthetic allocation failure");
    }
    const url = `blob:synthetic-${allocated.length}`;
    allocated.push(url);
    return url;
  });
  spyOn(URL, "revokeObjectURL").mockImplementation((url) => {
    revoked.push(url);
  });

  const Probe = () => {
    const value = usePromptInputAttachments();
    useEffect(() => {
      captured = value;
    }, [value]);
    return null;
  };

  const attachments = () => {
    if (!captured) {
      throw new Error("Attachment consumer was not rendered");
    }
    return captured;
  };

  const reset = () => {
    states.length = 0;
    refs.length = 0;
    effects.length = 0;
    pending.clear();
    allocated.length = 0;
    revoked.length = 0;
    createUrl.mockClear();
    failAt = Number.POSITIVE_INFINITY;
    captured = undefined;
    updaterCalls = 0;
  };

  const render = (element: ReactNode) => {
    stateIndex = 0;
    refIndex = 0;
    effects.length = 0;
    renderToStaticMarkup(element);
    return effects.map((effect) => effect());
  };

  const commit = () => {
    for (const [index, updates] of pending) {
      for (const update of updates) {
        if (typeof update === "function") {
          const next = update(states[index]);
          update(states[index]);
          updaterCalls += 2;
          states[index] = next;
        } else {
          states[index] = update;
        }
      }
    }
    pending.clear();
  };

  const fixture = (
    mode: "provider" | "local",
    onError = mock(() => {}),
    maxFiles = 2,
    options: Partial<PromptInputProps> = {}
  ) => {
    reset();
    const element =
      mode === "provider" ? (
        <PromptInputProvider>
          <Probe />
        </PromptInputProvider>
      ) : (
        <PromptInput
          maxFiles={maxFiles}
          onError={onError}
          onSubmit={() => {}}
          {...options}
        >
          <Probe />
        </PromptInput>
      );
    const cleanups = render(element);
    return {
      onError,
      replay: () => render(element),
      flush() {
        commit();
        render(element);
        return attachments();
      },
      unmount() {
        for (const cleanup of cleanups) {
          if (typeof cleanup === "function") {
            cleanup();
          }
        }
      },
    };
  };

  const file = (name: string) => new File([name], name, { type: "text/plain" });

  test.each(["provider", "local"] as const)(
    "%s queued additions and render replay retain every owned URL",
    (mode) => {
      const owner = fixture(mode);
      attachments().add([file("first")]);
      expect(allocated).toHaveLength(1);
      owner.replay();
      attachments().add([file("second")]);
      expect(owner.flush().files.map((item) => item.filename)).toEqual([
        "first",
        "second",
      ]);
      expect(allocated).toHaveLength(2);
      expect(updaterCalls).toBe(0);
      owner.unmount();
      owner.unmount();
      expect(revoked).toEqual(allocated);
    }
  );

  test.each(["provider", "local"] as const)(
    "%s remove and clear release URLs outside replayable updaters",
    (mode) => {
      const owner = fixture(mode);
      attachments().add([file("first"), file("second")]);
      const first = owner.flush().files[0];
      if (!first) {
        throw new Error("First attachment was not committed");
      }
      attachments().remove(first.id);
      attachments().remove(first.id);
      expect(revoked).toEqual([first.url]);
      expect(owner.flush().files).toHaveLength(1);
      attachments().clear();
      attachments().clear();
      expect(owner.flush().files).toEqual([]);
      owner.unmount();
      expect(revoked).toEqual(allocated);
      expect(updaterCalls).toBe(0);
    }
  );

  test.each(["provider", "local"] as const)(
    "%s unmount releases an addition before state commits",
    (mode) => {
      const owner = fixture(mode);
      attachments().add([file("pending")]);
      expect(attachments().files).toEqual([]);
      owner.unmount();
      expect(allocated).toHaveLength(1);
      expect(revoked).toEqual(allocated);
    }
  );

  test.each(["provider", "local"] as const)(
    "%s failed allocation rolls back only its new URLs",
    (mode) => {
      const owner = fixture(
        mode,
        mock(() => {}),
        3
      );
      attachments().add([file("existing")]);
      owner.flush();
      failAt = allocated.length + 1;
      expect(() => attachments().add([file("new"), file("fails")])).toThrow(
        "Synthetic allocation failure"
      );
      const remaining = owner.flush().files;
      expect(remaining.map((item) => item.filename)).toEqual(["existing"]);
      expect(revoked).toEqual(allocated.slice(1));
      owner.unmount();
      expect([...revoked].sort()).toEqual([...allocated].sort());
    }
  );

  test("local queued adds cap allocations and notify only after ownership updates", () => {
    let reentered = false;
    const onError = mock(() => {
      if (!reentered) {
        reentered = true;
        attachments().add([file("reentrant")]);
      }
    });
    const owner = fixture("local", onError);
    attachments().add([file("first")]);
    attachments().add([file("second"), file("capped")]);
    expect(owner.flush().files.map((item) => item.filename)).toEqual([
      "first",
      "second",
    ]);
    expect(allocated).toHaveLength(2);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(updaterCalls).toBe(0);
    owner.unmount();
    expect(revoked).toEqual(allocated);
  });

  test("local validation allocates only accepted files within the size limit", () => {
    const onError = mock(() => {});
    const owner = fixture("local", onError, 2, {
      accept: "image/*",
      maxFileSize: 4,
    });
    attachments().add([file("wrong-type")]);
    expect(onError).toHaveBeenLastCalledWith({
      code: "accept",
      message: "No files match the accepted types.",
    });
    attachments().add([
      new File(["large-image"], "large.png", { type: "image/png" }),
    ]);
    expect(onError).toHaveBeenLastCalledWith({
      code: "max_file_size",
      message: "All files exceed the maximum size.",
    });
    expect(allocated).toEqual([]);
    attachments().add([
      file("wrong-type"),
      new File(["tiny"], "small.png", { type: "image/png" }),
      new File(["large-image"], "large.png", { type: "image/png" }),
    ]);
    expect(owner.flush().files.map((item) => item.filename)).toEqual([
      "small.png",
    ]);
    expect(allocated).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(2);
    owner.unmount();
    expect(revoked).toEqual(allocated);
  });

  test("a throwing max-files callback leaves accepted attachments owned", () => {
    const onError = mock(() => {
      throw new Error("Synthetic notification failure");
    });
    const owner = fixture("local", onError, 1);
    expect(() => attachments().add([file("accepted"), file("capped")])).toThrow(
      "Synthetic notification failure"
    );
    expect(owner.flush().files.map((item) => item.filename)).toEqual([
      "accepted",
    ]);
    expect(allocated).toHaveLength(1);
    expect(revoked).toEqual([]);
    expect(onError).toHaveBeenCalledTimes(1);
    owner.unmount();
    expect(revoked).toEqual(allocated);
  });

  test("provider-mode PromptInput teardown never revokes provider attachments", () => {
    reset();
    const element = (
      <PromptInputProvider>
        <PromptInput onSubmit={() => {}}>
          <Probe />
        </PromptInput>
      </PromptInputProvider>
    );
    const cleanups = render(element).filter(
      (cleanup) => typeof cleanup === "function"
    );
    expect(cleanups).toHaveLength(2);
    attachments().add([file("provider-owned")]);
    commit();
    render(element);
    cleanups[1]?.();
    expect(revoked).toEqual([]);
    cleanups[0]?.();
    expect(revoked).toEqual(allocated);
  });
}
