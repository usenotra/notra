// Describe the libheif context and image handles so every decode path can release allocations.
export type HeicDecoder = {
  heif_context_alloc: () => HeicContext;
  heif_context_free: (context: HeicContext) => void;
  heif_context_set_maximum_image_size_limit: (
    contextPointer: number,
    maximumWidth: number
  ) => void;
  heif_context_read_from_memory: (
    context: HeicContext,
    bytes: Uint8Array
  ) => { code: unknown };
  heif_js_context_get_primary_image_handle: (context: HeicContext) => unknown;
  heif_error_code: { heif_error_Ok: unknown };
  HeifImage: new (handle: unknown) => HeicImage;
};

// Keep the Embind context object distinct from the raw pointer required by the security-limit function.
export type HeicContext = { $$: { ptr: number } };

// Track native HEIC handles separately from the pixels copied into Sharp.
export type HeicImage = {
  get_width: () => number;
  get_height: () => number;
  display: (
    output: { width: number; height: number; data: Uint8ClampedArray },
    callback: (result: { data: Uint8ClampedArray } | null) => void
  ) => void;
  free: () => void;
};
