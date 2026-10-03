import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";
import type { useTranslations } from "use-intl";

import type { CONTENT_COLLECTION_VIEWS } from "@/constants/content-collections";
import type { TablePaginationState } from "@/types/table";

export type CollectionsTranslator = ReturnType<
  typeof useTranslations<"content.collections">
>;

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
  /** Project the server prefetch used. Null when the organization has none. */
  initialProjectId: string | null;
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
  organizationId: string;
  organizationSlug: string;
  view: ContentCollectionView;
  loading?: boolean;
}

export interface CollectionMenuItemsProps {
  collection: PostCollectionSummary;
  organizationSlug: string;
  disabled: boolean;
  onDelete: (collection: PostCollectionSummary) => void;
  variant?: "context" | "dropdown";
}

export type CollectionsSkeletonProps = Partial<
  Pick<CollectionsViewProps, "view">
>;
