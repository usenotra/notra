// Describe the libheif context and image handles so every decode path can release allocations.
export type HeicDecoder = {
  heif_context_alloc: () => number;
  heif_context_free: (context: number) => void;
  heif_context_set_maximum_image_size_limit: (
    context: number,
    pixels: number
  ) => void;
  heif_context_read_from_memory: (
    context: number,
    bytes: Uint8Array
  ) => { code: unknown };
  heif_context_get_list_of_item_IDs: (context: number) => number[];
  heif_js_context_get_list_of_top_level_image_IDs: (
    context: number
  ) => number[];
  heif_js_context_get_image_handle: (context: number, id: number) => unknown;
  heif_item_get_item_type: (context: number, id: number) => string;
  heif_error_code: { heif_error_Ok: unknown };
  HeifImage: new (handle: unknown) => HeicImage;
};

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
