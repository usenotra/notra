import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";
import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

import type { BREAK_UI_DATASETS } from "@/constants/design-system-break-ui";
import type {
  InvitationSummary,
  MemberWithUser,
  OrganizationRow,
} from "@/types/organizations/actions";

export type BreakUiDataset = (typeof BREAK_UI_DATASETS)[number];

export interface BreakUiSentimentCounts {
  engine: string;
  positive: number;
  neutral: number;
  negative: number;
  /** Answers that mentioned the brand without a rating. */
  unrated?: number;
  /** Answers that never mentioned the brand. */
  missed?: number;
}

export interface BreakUiFixture {
  sentiment: GeoSentimentResponse | null;
  organizations: OrganizationRow[];
  activeOrganization: OrganizationRow;
  members: MemberWithUser[];
  invitations: InvitationSummary[];
  collections: PostCollectionSummary[];
  collectionTotal: number;
}
