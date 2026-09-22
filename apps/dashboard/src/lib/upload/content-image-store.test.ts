import { beforeAll, expect, mock, test } from "bun:test";

import sharp from "sharp";

mock.module("server-only", () => ({}));

let saveContentImage: typeof import("./content-image-store").saveContentImage;
let readContentImage: typeof import("./content-image-store").readContentImage;

beforeAll(async () => {
  ({ readContentImage, saveContentImage } =
    await import("./content-image-store"));
});

test("stores an image on disk and reads the same bytes back", async () => {
  const png = await sharp({
    create: {
      background: { b: 10, g: 20, r: 30 },
      channels: 3,
      height: 8,
      width: 8,
    },
  })
    .png()
    .toBuffer();

  const saved = await saveContentImage({
    bytes: png,
    mimeType: "image/png",
    organizationId: "org_1",
  });

  expect(saved.url).toBe(`/api/uploads/content-images/${saved.key}`);
  const stored = await readContentImage(saved.key, 1024 * 1024);
  expect(stored?.mimeType).toBe("image/png");
  expect(stored && Buffer.compare(stored.bytes, png)).toBe(0);
});
