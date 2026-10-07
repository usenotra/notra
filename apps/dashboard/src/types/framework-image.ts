export interface ImageSource {
  data: Buffer;
  cacheControl?: string;
}

export interface CachedImage {
  data: Buffer;
  contentType: string;
  etag: string;
  maxAge: number;
  createdAt: number;
}
