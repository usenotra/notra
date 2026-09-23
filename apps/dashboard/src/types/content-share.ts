import type { PostVisibility } from "@notra/schemas/dashboard/content";

export interface ContentShareMenuProps {
  content: {
    shareToken: string | null;
    visibility: PostVisibility;
  };
  contentId: string;
  organizationId: string;
  organizationSlug: string;
}

export interface SharedContentViewModel {
  title: string;
  slug: string | null;
  date: string;
  updatedAt: string;
  authorName: string | null;
  contentType: string;
  bodyHtml: string | null;
  imageSrc: string | null;
  text: string | null;
}
