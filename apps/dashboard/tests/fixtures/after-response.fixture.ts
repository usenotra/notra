import { expect, mock, test } from "bun:test";
import { setTimeout } from "node:timers/promises";

import { H3Event, toResponse } from "nitro/h3";

import {
  afterResponse,
  dashboardRequestContext,
} from "../../src/lib/framework/after-response";

test("lifetime tasks require a request context", () => {
  expect(() => afterResponse(() => undefined)).toThrow(
    "No dashboard request lifetime available"
  );
});

test("stream completion runs registered work once and extends the platform lifetime", async () => {
  const event = new H3Event(new Request("http://localhost/stream"));
  const pending: Promise<unknown>[] = [];
  event.waitUntil = (promise) => {
    pending.push(Promise.resolve(promise));
  };
  const completed = mock(async () => {
    await Promise.resolve();
  });
  const response = await dashboardRequestContext.run(event, () => {
    afterResponse(completed);
    return toResponse(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("hello"));
            controller.close();
          },
        })
      ),
      event
    );
  });
  expect(completed).not.toHaveBeenCalled();
  expect(await response.text()).toBe("hello");
  await setTimeout(0);
  await Promise.all(pending);
  expect(completed).toHaveBeenCalledTimes(1);
  expect(pending).toHaveLength(1);
});

test("cancelled streams run cleanup without crossing request boundaries", async () => {
  const completed: string[] = [];
  const requests = await Promise.all(
    ["first", "second"].map(async (name) => {
      const event = new H3Event(new Request(`http://localhost/${name}`));
      return dashboardRequestContext.run(event, async () => {
        await Promise.resolve();
        afterResponse(() => {
          completed.push(name);
        });
        return toResponse(
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array([1]));
              },
            })
          ),
          event
        );
      });
    })
  );
  expect(completed).toEqual([]);
  await requests[0]?.body?.cancel();
  await setTimeout(0);
  expect(completed).toEqual(["first"]);
  await requests[1]?.body?.cancel();
  await setTimeout(0);
  expect(completed).toEqual(["first", "second"]);
  expect(dashboardRequestContext.getStore()).toBeUndefined();
});
