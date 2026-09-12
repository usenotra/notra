import type {
  ContentResponse,
  PostCollectionContext,
} from "@notra/schemas/dashboard/content";

export interface ContentApiResponse {
  content: ContentResponse;
  collection: PostCollectionContext | null;
}
