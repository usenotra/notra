export interface ArchiveFile {
  path: string;
  data: Uint8Array<ArrayBuffer>;
}

export interface ArchiveLimits {
  maxFiles: number;
  maxBytes: number;
  maxFileBytes: number;
}
