import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

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
}

export interface GroupTypeIconProps {
  type: string;
  className?: string;
}

export interface GroupContentTypesProps {
  contentTypes: string[];
}

export type CollectionStatus = "generating" | "published" | "draft" | "empty";

export interface CollectionsTableProps {
  collections: PostCollectionSummary[];
  pagination: TablePaginationState;
  onOpen: (collectionId: string) => void;
  onHover?: (collectionId: string) => void;
}
