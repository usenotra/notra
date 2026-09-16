import { MANUAL_POST_CONTENT_TYPES } from "@notra/schemas/constants/content";
import type { ManualPostContentType } from "@notra/schemas/dashboard/content";

import { CREATE_POST_DEFAULT_FORMAT } from "@/constants/content-formats";

export function toManualPostContentType(value: string): ManualPostContentType {
  return (
    MANUAL_POST_CONTENT_TYPES.find((contentType) => contentType === value) ??
    CREATE_POST_DEFAULT_FORMAT
  );
}
