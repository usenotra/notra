import type {
  CreatePostFields,
  ManualPostContentType,
} from "@notra/schemas/shared/post";

export interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationSlug: string;
}

export interface CreatePostFormValues {
  contentType: ManualPostContentType;
  title: string;
  slug: string;
}

export interface CreatePostMutationVariables extends CreatePostFields {
  organizationId: string;
  projectId: string | undefined;
}

export interface CreatePostMutationResult {
  contentId: string;
  collectionId: string;
}

export interface CreateContentButtonGroupProps {
  disabled?: boolean;
  onCreateContent: () => void;
  onCreatePost: () => void;
  onPrefetchCreateContent?: () => void;
  onPrefetchCreatePost?: () => void;
}

export interface CreateContentActionsProps {
  organizationId: string;
  organizationSlug: string;
  entry: "home" | "content_list";
}
