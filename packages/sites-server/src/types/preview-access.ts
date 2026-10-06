import type { Site } from "./sites";

export interface PreviewAccessUrlParams {
  site: Pick<Site, "id" | "slug">;
  previewKey: string;
  next?: string;
  kind: "member" | "share";
  userId: string;
}

export interface PreviewAccessUrl {
  url: string;
  expiresAt: Date;
}
