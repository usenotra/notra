import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

import type { CONTENT_COLLECTION_VIEWS } from "@/constants/content-collections";
import type { TablePaginationState } from "@/types/table";

export interface CollectionPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export interface RenameCollectionDialogProps {
  collectionId: string;
  currentName: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface CollectionDetailPageClientProps {
  collectionId: string;
  organizationId: string;
  organizationSlug: string;
}

export interface ContentListPageClientProps {
  organizationSlug: string;
  initialProjectId?: string;
}

export interface GroupTypeIconProps {
  type: string;
  className?: string;
}

export interface GroupContentTypesProps {
  contentTypes: string[];
}

export type CollectionStatus = "generating" | "published" | "draft" | "empty";

export type ContentCollectionView = (typeof CONTENT_COLLECTION_VIEWS)[number];

export interface CollectionsViewProps {
  collections: PostCollectionSummary[];
  pagination: TablePaginationState;
  organizationSlug: string;
  view: ContentCollectionView;
}

export type CollectionsSkeletonProps = Partial<
  Pick<CollectionsViewProps, "view">
>;
