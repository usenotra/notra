// Type the bundled libheif entrypoint so native context ownership stays explicit at the call site.
declare module "libheif-js/wasm-bundle" {
  import type { HeicDecoder } from "./content/heic-image";

  // Supply the decoder API needed for bounded image decoding and guaranteed context cleanup.
  const decoder: HeicDecoder;
  export = decoder;
}
