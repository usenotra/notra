import { expect, mock, test } from "bun:test";

// Stub metadata parsing to prove oversized HEIC dimensions never trigger pixel decoding.
const disposed = mock(() => {});
// Supply an image whose compressed container is tiny but whose dimensions exceed the pixel budget.
const decoded = mock(() => {
  const images = [{ width: 100_000, height: 100_000 }];
  return Promise.resolve(Object.assign(images, { dispose: disposed }));
});
// Fail immediately if the conversion path executes despite the metadata guard.
const converted = mock(() =>
  Promise.reject(new Error("Decoded before checking pixels"))
);

mock.module("server-only", () => ({}));
mock.module("heic-decode", () => ({ default: { all: decoded } }));
mock.module("heic-convert", () => ({ default: converted }));

const { compressContentImage } = await import("./compress-content-image");

test("rejects oversized HEIC metadata before allocating decoded pixels", async () => {
  const bytes = Buffer.from("0000ftypheic0000");
  await expect(compressContentImage(bytes)).rejects.toThrow(
    "HEIC image exceeds the 40 megapixel limit"
  );
  expect(decoded).toHaveBeenCalledTimes(1);
  expect(disposed).toHaveBeenCalledTimes(1);
  expect(converted).not.toHaveBeenCalled();
});
