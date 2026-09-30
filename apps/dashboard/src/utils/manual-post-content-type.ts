import { manualPostContentTypeSchema } from "@notra/schemas/shared/post";
import type { ManualPostContentType } from "@notra/schemas/shared/post";

import { CREATE_POST_DEFAULT_FORMAT } from "@/constants/content-formats";

export function toManualPostContentType(value: string): ManualPostContentType {
  const parsed = manualPostContentTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : CREATE_POST_DEFAULT_FORMAT;
}
