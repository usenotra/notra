export interface R2TextObject {
  text: string;
  etag: string;
}

export interface R2PutOptions {
  contentType?: string;
  cacheControl?: string;
  ifMatch?: string;
  ifNoneMatch?: "*";
}
