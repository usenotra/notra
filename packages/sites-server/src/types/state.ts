import type {
  SitePreviewPassword,
  SitePreviewPointer,
  SiteServingState,
} from "@notra/sites-core/types/deployment";

export interface ServingSiteRef {
  id: string;
  slug: string;
}

export interface ServingStateObject {
  state: SiteServingState;
  etag: string;
}

export type ServingStateMutation<T> =
  | { write: SiteServingState; result: T }
  | { skip: true; result: T };

export interface ServingPreviewAccess {
  previewPassword: SitePreviewPassword | null;
  previewVisibility: SitePreviewPointer["visibility"] | null;
}
export type ServingStateAttemptFailure = {
  readonly _tag: "CasConflict" | "OperationFailure";
  readonly error: unknown;
};
