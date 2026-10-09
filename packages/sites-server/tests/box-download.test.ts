import { expect, spyOn, test } from "bun:test";

import { downloadBytes } from "../src/box-build";
import * as env from "../src/env";

test("artifact downloads cancel at the byte limit with absent or inaccurate lengths", async () => {
  const key = spyOn(env, "getBoxApiKey").mockReturnValue("synthetic-test-key");
  try {
    for (const contentLength of [null, "1"]) {
      let pulls = 0;
      let cancelled = false;
      const response = new Response(
        new ReadableStream(
          {
            pull(controller) {
              pulls++;
              controller.enqueue(new Uint8Array([1, 2, 3]));
            },
            cancel() {
              cancelled = true;
            },
          },
          { highWaterMark: 0 }
        ),
        {
          headers:
            contentLength === null ? {} : { "content-length": contentLength },
        }
      );
      const fetch = spyOn(globalThis, "fetch").mockResolvedValue(response);
      const unbounded = spyOn(response, "arrayBuffer");
      try {
        await expect(
          downloadBytes("synthetic-box", "/out.tgz", 4)
        ).rejects.toThrow("larger than allowed");
        expect(cancelled).toBe(true);
        expect(pulls).toBe(2);
        expect(unbounded).not.toHaveBeenCalled();
      } finally {
        unbounded.mockRestore();
        fetch.mockRestore();
      }
    }
  } finally {
    key.mockRestore();
  }
});

test("artifact downloads accept the exact limit and cancel oversized declared bodies unread", async () => {
  const key = spyOn(env, "getBoxApiKey").mockReturnValue("synthetic-test-key");
  let cancelled = false;
  let pulls = 0;
  const declared = new Response(
    new ReadableStream(
      {
        pull() {
          pulls++;
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 }
    ),
    { headers: { "content-length": "5" } }
  );
  const fetch = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3, 4])))
    .mockResolvedValueOnce(declared);
  try {
    expect(await downloadBytes("synthetic-box", "/out.tgz", 4)).toEqual(
      new Uint8Array([1, 2, 3, 4])
    );
    await expect(downloadBytes("synthetic-box", "/out.tgz", 4)).rejects.toThrow(
      "larger than allowed"
    );
    expect(cancelled).toBe(true);
    expect(pulls).toBe(0);
  } finally {
    fetch.mockRestore();
    key.mockRestore();
  }
});
