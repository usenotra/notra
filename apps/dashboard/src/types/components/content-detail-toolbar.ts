import type { ContentResponse } from "@notra/schemas/dashboard/content";

import type { ContentDetailDocument } from "@/lib/hooks/use-content-detail-document";

export interface ContentDetailToolbarProps {
  content: ContentResponse;
  contentId: string;
  document: ContentDetailDocument;
  organizationId: string;
  organizationSlug: string;
}

export type ContentDetailImageActionsProps = Pick<
  ContentDetailToolbarProps,
  "content" | "contentId" | "document"
>;
