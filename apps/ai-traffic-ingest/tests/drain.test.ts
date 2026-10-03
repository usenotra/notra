import { expect, test } from "bun:test";

import { startService } from "./utils/service";

test("SIGTERM waits for disconnected handlers and their deferred work", async () => {
  const service = await startService({}, "tests/fixtures/drain.ts");
  try {
    const controller = new AbortController();
    const response = fetch(service.url, { signal: controller.signal }).catch(
      () => null
    );
    while ((await (await fetch(`${service.url}/started`)).text()) !== "yes") {
      await Bun.sleep(5);
    }
    controller.abort();
    await response;
    service.child.kill("SIGTERM");
    const reader = service.child.stdout.getReader();
    const decoder = new TextDecoder();
    let output = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      output += decoder.decode(value, { stream: true });
    }
    reader.releaseLock();
    expect(await service.child.exited).toBe(0);
    expect(output).toContain("request completed");
    expect(output).toContain("background completed");
  } finally {
    service.child.kill();
    await service.child.exited;
  }
});
