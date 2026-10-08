import type * as schema from "@notra/db/schema";
import type {
  SitePreviewPassword,
  SitePreviewPointer,
  SiteServingState,
} from "@notra/sites-core/types/deployment";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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

export interface ServingAccess {
  previewPassword: SitePreviewPassword | null;
  previewVisibility: SitePreviewPointer["visibility"] | null;
  analyticsEnabled: boolean;
}
export type ServingStateAttemptFailure = {
  readonly _tag: "CasConflict" | "OperationFailure";
  readonly error: unknown;
};

/** Named so the inferred effect type does not reach into pg's Pool. */
export type ServingAccessExecutor = Pick<
  NodePgDatabase<typeof schema>,
  "select"
>;
