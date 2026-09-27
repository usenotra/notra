// Describe metadata handles so HEIC pixel limits can be enforced before decoding allocates pixel buffers.
export type HeicImageMetadata = Array<{ width: number; height: number }> & {
  dispose: () => void;
};
