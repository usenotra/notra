import { expect, mock, test } from "bun:test";

// Model a HEIC container whose coded dimensions are larger than its compact byte representation.
function box(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(payload.length + 8);
  header.write(type, 4);
  return Buffer.concat([header, payload]);
}

// Build metadata that must fail before the native HEIF decoder is invoked.
function oversizedHeic(): Buffer {
  const dimensions = Buffer.alloc(12);
  dimensions.writeUInt32BE(100_000, 4);
  dimensions.writeUInt32BE(100_000, 8);
  return Buffer.concat([
    box("ftyp", Buffer.from("heic0000")),
    box(
      "meta",
      Buffer.concat([
        Buffer.alloc(4),
        box("iprp", box("ipco", box("ispe", dimensions))),
      ])
    ),
  ]);
}

// Observe native context disposal when malformed files fail to parse.
const freed = mock(() => {});
// Simulate the pre-handle parsing exception that leaked in heic-decode.
const parse = mock(() => {
  throw new Error("malformed item");
});
// Track whether oversized metadata is rejected before native context allocation.
// Emulate the actual Embind context object rather than the old numeric mock.
const context = { $$: { ptr: 123 } };
// Observe context allocation after valid-size metadata passes preflight.
const alloc = mock(() => context);
// Assert the raw WASM setter receives a pointer and the correct square-root bound.
const limit = mock(() => {});

mock.module("server-only", () => ({}));
mock.module("libheif-js/wasm-bundle", () => ({
  default: {
    heif_context_alloc: alloc,
    heif_context_free: freed,
    heif_context_set_maximum_image_size_limit: limit,
    heif_context_read_from_memory: parse,
  },
}));

const { compressContentImage } = await import("./compress-content-image");

test("rejects oversized coded HEIC pixels before native parsing", async () => {
  await expect(compressContentImage(oversizedHeic())).rejects.toThrow(
    "HEIC image exceeds the 40 megapixel limit"
  );
  expect(alloc).not.toHaveBeenCalled();
});

test("allows distinct coded tile properties within the individual pixel budget", async () => {
  const dimensions = Buffer.alloc(12);
  dimensions.writeUInt32BE(6000, 4);
  dimensions.writeUInt32BE(6000, 8);
  const pixels = box("ispe", dimensions);
  const bytes = Buffer.concat([
    box("ftyp", Buffer.from("heic0000")),
    box(
      "meta",
      Buffer.concat([
        Buffer.alloc(4),
        box("iprp", box("ipco", Buffer.concat([pixels, pixels]))),
      ])
    ),
  ]);
  await expect(compressContentImage(bytes)).rejects.toThrow("malformed item");
  expect(alloc).toHaveBeenCalledTimes(1);
  expect(limit).toHaveBeenCalledWith(123, 6324);
});

test("accepts metadata with more than sixteen small tile properties", async () => {
  const dimensions = Buffer.alloc(12);
  dimensions.writeUInt32BE(64, 4);
  dimensions.writeUInt32BE(64, 8);
  const bytes = Buffer.concat([
    box("ftyp", Buffer.from("heic0000")),
    box(
      "meta",
      Buffer.concat([
        Buffer.alloc(4),
        box(
          "iprp",
          box(
            "ipco",
            Buffer.concat(
              Array.from({ length: 24 }, () => box("ispe", dimensions))
            )
          )
        ),
      ])
    ),
  ]);
  await expect(compressContentImage(bytes)).rejects.toThrow("malformed item");
  expect(alloc).toHaveBeenCalledTimes(2);
});

test("frees the native HEIC context if malformed parsing throws", async () => {
  const validDimensions = oversizedHeic();
  validDimensions.writeUInt32BE(100, validDimensions.indexOf("ispe") + 8);
  validDimensions.writeUInt32BE(100, validDimensions.indexOf("ispe") + 12);
  await expect(compressContentImage(validDimensions)).rejects.toThrow(
    "malformed item"
  );
  expect(alloc).toHaveBeenCalledTimes(3);
  expect(freed).toHaveBeenCalledWith(context);
});
