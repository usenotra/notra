export type UploadType =
  | "avatar"
  | "logo"
  | "brand_asset"
  | "brand_guideline_pdf"
  | "content"
  | "chat";

/** Response from the upload presign procedure */
export interface UploadPresignedResponse {
  /** Presigned PUT URL for direct upload to R2 */
  url: string;
  /** Object key in the bucket (e.g. avatars/yGE3_Yy8w6F5TFG-iiikk.webp) */
  key: string;
  /** Public URL to access the file after upload */
  publicUrl: string;
}

export interface UploadFileResponse {
  url: string;
  key: string;
}

export interface UploadFileProps {
  file: File;
  type: UploadType;
}

export interface DeleteChatUploadProps {
  key: string;
}
