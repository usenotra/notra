import { expect, test } from "bun:test";

import { prepareChatImage } from "./prepare-chat-image";

test("converts Apple photos to a JPEG attachment before chat upload", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData | undefined)?.get("file")).toBeInstanceOf(
      File
    );
    return new Response(new Blob(["jpeg bytes"], { type: "image/jpeg" }));
  };
  try {
    const file = new File(["heic bytes"], "photo.heic", {
      type: "image/heic",
    });
    const result = await prepareChatImage(file);
    expect(requestedUrl).toBe("/api/uploads/convert-heic");
    expect(result.name).toBe("photo.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(await result.text()).toBe("jpeg bytes");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("leaves supported chat images unchanged", async () => {
  const file = new File(["jpeg"], "photo.jpg", { type: "image/jpeg" });
  expect(await prepareChatImage(file)).toBe(file);
});
