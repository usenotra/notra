import { describe, expect, test } from "bun:test";

import { tool } from "ai";
import { z } from "zod";

import { withToolErrorPayloads } from "./tool-error-payload";

const options = { toolCallId: "call-1", messages: [] } as never;

async function collect(iterable: AsyncIterable<unknown>) {
  const values: unknown[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
}

describe("withToolErrorPayloads", () => {
  test("returns plain results and converts thrown errors", async () => {
    const { ok, fails } = withToolErrorPayloads({
      ok: tool({
        inputSchema: z.object({}),
        execute: async () => ({ value: 1 }),
      }),
      fails: tool({
        inputSchema: z.object({}),
        execute: async (): Promise<{ value: number }> => {
          throw new Error("boom");
        },
      }),
    });
    expect(await ok?.execute?.({}, options)).toEqual({ value: 1 });
    expect(await fails?.execute?.({}, options)).toMatchObject({
      isError: true,
      error: "boom",
    });
  });

  test("keeps generator tools streaming", async () => {
    const { streaming } = withToolErrorPayloads({
      streaming: tool({
        inputSchema: z.object({}),
        async *execute() {
          yield { step: 1 };
          yield { step: 2 };
        },
      }),
    });
    const result = streaming?.execute?.({}, options);
    expect(await collect(result as AsyncIterable<unknown>)).toEqual([
      { step: 1 },
      { step: 2 },
    ]);
  });

  test("turns a failure mid-stream into a final error payload", async () => {
    const { streaming } = withToolErrorPayloads({
      streaming: tool({
        inputSchema: z.object({}),
        async *execute() {
          yield { step: 1 };
          throw new Error("sandbox gone");
        },
      }),
    });
    const values = await collect(
      streaming?.execute?.({}, options) as AsyncIterable<unknown>
    );
    expect(values[0]).toEqual({ step: 1 });
    expect(values[1]).toMatchObject({ isError: true, error: "sandbox gone" });
  });
});
